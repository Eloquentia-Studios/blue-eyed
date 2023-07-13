import argon2 from 'argon2'
import type { Request } from 'express'
import { z } from 'zod'
import { cacheTime } from '../constants/time'
import generateRandomString from '../libs/generateRandomString'
import { getRequestUserTokenData } from './authentication'
import { deleteCache, getCache, setCache } from './cache'
import prisma from './prisma'

export const UsernameSchema = z
  .string()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9_]+$/, { message: 'Username must only contain alphanumeric characters and underscores.' })
export const PasswordSchema = z.string().min(12)

export const UserRegistrationSchema = z.object({
  username: UsernameSchema,
  email: z.string().email(),
  password: PasswordSchema
})

type UserRegistrationInput = z.infer<typeof UserRegistrationSchema>

export const verifyUser = async (id: string, password: string) => {
  const user = await getUserById(id)
  if (!user) return false

  return await verifyPassword(user.password, password)
}

export const createUser = async (info: UserRegistrationInput) => {
  if (!UserRegistrationSchema.safeParse(info).success) throw new Error('Invalid user registration input.')

  return await prisma.user.create({
    data: {
      ...info,
      username: info.username.toLowerCase(),
      displayName: info.username,
      password: await hashPassword(info.password)
    }
  })
}

export const getUserIdByUsername = async (username: string) => {
  const res = await prisma.user.findUnique({
    where: {
      username: username.toLowerCase()
    },
    select: {
      id: true
    }
  })

  return res ? res.id : null
}

export const getUserById = async (id: string) =>
  prisma.user.findUnique({
    where: {
      id
    }
  })

export const getUsers = async () =>
  prisma.user.findMany({
    select: {
      id: true,
      displayName: true,
      email: true
    }
  })

export const deleteUser = async (id: string) =>
  prisma.user.delete({
    where: {
      id
    }
  })

export const setUserPassword = async (userId: string, password: string) => {
  const hash = await hashPassword(password)

  await prisma.user.update({
    where: {
      id: userId
    },
    data: {
      password: hash
    }
  })

  await setCache(`${userId}:last-password-reset`, Date.now())
}

export const getLastPasswordReset = async (userId: string) => getCache<number>(`${userId}:last-password-reset`)

export const generateResetToken = async (id: string) => {
  const token = await generateRandomString(128)

  setCache(token, id, { ttl: cacheTime.hour * 6 })

  return token
}

export const getUserIdByResetToken = async (token: string) => {
  const result = await getCache<string>(token)
  return result
}

export const getUserFromRequest = async (req: Request) => {
  const tokenData = await getRequestUserTokenData(req)
  if (!tokenData) return null
  let user = await getUserById(tokenData.userId)
  if (!user) return null

  return { ...user, password: undefined }
}

export const invalidateResetToken = async (token: string) => deleteCache(token)

const hashPassword = async (password: string) => argon2.hash(password)
const verifyPassword = async (hash: string, password: string) => argon2.verify(hash, password)
