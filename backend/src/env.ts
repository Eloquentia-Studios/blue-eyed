import { createEnv } from '@t3-oss/env-core'
import z from 'zod'

export const ENV = createEnv({
  server: {
    SERVICE_HOSTNAME: z.string().url(),
    DATABASE_URL: z.string().url({ message: 'Must be a valid PostgreSQL URL.' }),
    REDIS_URL: z.string().url(),
    LOG_LEVEL: z.enum(['debug', 'verbose', 'info', 'warn', 'error']).default('info'),

    PORT: z.coerce.number().int().min(1, { message: 'Port cannot be outside the range 1-65535' }).max(65535, { message: 'Port cannot be outside the range 1-65535' }).default(3000),
    NODE_ENV: z.enum(['development', 'production']).default('development')
  },
  runtimeEnv: process.env
})
