import argon2 from 'argon2'
import { z } from 'zod'
import prisma from './prisma.js'

export const UserRegistrationSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(12)
})

type UserRegistrationInput = z.infer<typeof UserRegistrationSchema>

export const createUser = async (info: UserRegistrationInput) => {
  if (!UserRegistrationSchema.safeParse(info).success) throw new Error('Invalid user registration input.')

  return await prisma.user.create({
    data: {
      ...info,
      password: await hashPassword(info.password)
    }
  })
}

const hashPassword = async (password: string) => argon2.hash(password)
const verifyPassword = async (hash: string, password: string) => argon2.verify(hash, password)
