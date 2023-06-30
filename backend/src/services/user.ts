import argon2 from 'argon2'
import { z } from 'zod'
import generateRandomString from '../libs/generateRandomString.js'
import { deleteCache, getCache, setCache } from './cache.js'
import prisma from './prisma.js'

export const PasswordSchema = z.string().min(12)

export const UserRegistrationSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_]+$/, { message: 'Username must only contain alphanumeric characters and underscores.' }),
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
      password: await hashPassword(info.password)
    }
  })
}

export const getUserIdByUsername = async (username: string) => {
  const res = await prisma.user.findUnique({
    where: {
      username
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
      username: true,
      email: true
    }
  })

export const deleteUser = async (id: string) =>
  prisma.user.delete({
    where: {
      id
    }
  })

export const setUserPassword = async (id: string, password: string) => {
  const hash = await hashPassword(password)

  await prisma.user.update({
    where: {
      id
    },
    data: {
      password: hash
    }
  })
}

export const generateResetToken = async (id: string) => {
  const token = await generateRandomString(128)

  const ttl = 60 * 60 * 6 // 6 hours
  setCache(token, id, { ttl })

  return token
}

export const getUserIdByResetToken = async (token: string) => {
  const result = await getCache<string>(token)
  return result
}

export const invalidateResetToken = async (token: string) => deleteCache(token)

const hashPassword = async (password: string) => argon2.hash(password)
const verifyPassword = async (hash: string, password: string) => argon2.verify(hash, password)
