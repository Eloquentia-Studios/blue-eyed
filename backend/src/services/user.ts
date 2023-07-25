import argon2 from 'argon2'
import type { Request } from 'express'
import { z } from 'zod'
import { cacheTime } from '../constants/time'
import generateRandomString from '../libs/generateRandomString'
import { getRequestUserTokenData } from './authentication'
import { deleteCache, getCache, setCache } from './cache'
import logger from './logging'
import prisma from './prisma'

export const PasswordSchema = z.string().min(12)
export const UsernameSchema = z
  .string()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9_]+$/, { message: 'Username must only contain alphanumeric characters and underscores.' })

export const UserRegistrationSchema = z.object({
  username: UsernameSchema,
  email: z.string().email(),
  password: PasswordSchema
})

type UserRegistrationInput = z.infer<typeof UserRegistrationSchema>

export const verifyUser = async (id: string, password: string) => {
  logger.debug(`Verifying user ${id}`)
  const user = await getUserById(id)
  if (!user) {
    logger.debug(`Could not verify user ${id} as they do not exist.`)
    return false
  }

  const result = await verifyPassword(user.password, password)
  if (!result) {
    logger.debug(`Could not verify user ${id} as their password is incorrect.`)
    return false
  }

  logger.debug(`Successfully verified user ${id}`)
  return true
}

export const createUser = async (info: UserRegistrationInput, roleIds: string[] = []) => {
  if (!UserRegistrationSchema.safeParse(info).success) {
    logger.error('Invalid user information was passed to createUser.')
    throw new Error('Invalid user registration information.')
  }

  logger.debug(`Creating user with username ${info.username} and email ${info.email}`)
  return await prisma.user.create({
    data: {
      ...info,
      username: info.username.toLowerCase(),
      displayName: info.username,
      password: await hashPassword(info.password),
      roles: {
        connect: [...roleIds.map((role) => ({ id: role })), { name: 'User' }] // TODO: Make user role configurable
      }
    }
  })
}

export const getUserIdByUsername = async (username: string) => {
  logger.debug(`Getting user id for ${username}`)
  const res = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: { id: true }
  })

  if (!res) {
    logger.debug(`Could not find user id for ${username}`)
    return null
  }

  logger.debug(`Found id ${res.id} for ${username}`)
  return res.id
}

export const getUserById = async (id: string) => {
  logger.debug(`Getting user with id ${id}`)
  const user = await prisma.user.findUnique({
    where: { id }
  })

  if (!user) {
    logger.debug(`Could not find user with id ${id}`)
    return null
  }

  logger.debug(`User with id ${id} was ${user.username}`)
  return user
}

export const getUsers = async () => {
  logger.debug('Getting all users')
  const users = await prisma.user.findMany({
    select: {
      id: true,
      displayName: true,
      email: true
    }
  })

  logger.debug(`Found ${users.length} users`)
  return users
}

export const deleteUser = async (id: string) => {
  logger.debug(`Deleting user with id ${id}`)
  return await prisma.user.delete({
    where: { id }
  })
}

export const setUserPassword = async (userId: string, password: string) => {
  logger.debug(`Setting password for user ${userId}`)
  const hash = await hashPassword(password)

  await prisma.user.update({
    where: { id: userId },
    data: { password: hash }
  })

  await setCache(`${userId}:last-password-reset`, Date.now())
  logger.debug(`Successfully set password for user ${userId}`)
}

export const getLastPasswordReset = async (userId: string) => {
  logger.debug(`Getting last password reset for user ${userId}`)
  const reset = await getCache<number>(`${userId}:last-password-reset`)
  if (!reset) {
    logger.debug(`Could not find a previous password reset for user ${userId}`)
    return null
  }

  logger.debug(`Found last password reset for user ${userId} at ${reset}`)
  return reset
}

export const generateResetToken = async (id: string) => {
  logger.debug(`Generating reset token for user ${id}`)
  const token = await generateRandomString(128)
  await setCache(token, id, { ttl: cacheTime.hour * 6 })

  logger.debug(`Generated reset token ${token} for user ${id}`)
  return token
}

export const getUserIdByResetToken = async (token: string) => {
  logger.debug(`Getting user id for reset token ${token}`)
  const userId = await getCache<string>(token)
  logger.debug(`Found user id ${userId} for reset token ${token}`)
  return userId
}

export const getUserFromRequest = async (req: Request) => {
  logger.debug('Getting a user from a request')
  const tokenData = await getRequestUserTokenData(req)
  if (!tokenData) {
    logger.debug('Could not get user from request as no token data was found')
    return null
  }

  let user = await getUserById(tokenData.userId)
  if (!user) {
    logger.debug(`Could not get user from request as no user was found with id ${tokenData.userId}`)
    return null
  }

  logger.debug(`Successfully got user ${user.username} from request`)
  return { ...user, password: undefined }
}

export const invalidateResetToken = async (token: string) => {
  logger.debug(`Invalidating reset token ${token}`)
  return await deleteCache(token)
}

const hashPassword = async (password: string) => {
  logger.debug('Hashing password')
  return await argon2.hash(password)
}

const verifyPassword = async (hash: string, password: string) => {
  logger.debug('Verifying password')
  return await argon2.verify(hash, password)
}
