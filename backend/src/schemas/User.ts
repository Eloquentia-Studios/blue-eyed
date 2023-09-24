import { z } from 'zod'

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

export type UserRegistrationInput = z.infer<typeof UserRegistrationSchema>
