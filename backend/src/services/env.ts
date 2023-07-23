import z from 'zod'

const preprocessNumber = (a: unknown) => parseFloat(z.string().parse(a))
const allAreDigits = /^\\d+$/

const envSchema = z.object({
  SERVICE_HOSTNAME: z.string().url(),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().url(),
  PORT: z.coerce.number().int().min(1, { message: 'Port cannot be outside the range 1-65535' }).max(65535, { message: 'Port cannot be outside the range 1-65535' }).default(3000),

  NODE_ENV: z.enum(['development', 'production']).default('development')
})

export const ENV = envSchema.parse(process.env)
