import type { inferAsyncReturnType } from '@trpc/server'
import { initTRPC } from '@trpc/server'
import type * as trpcExpress from '@trpc/server/adapters/express'

export const createContext = async ({ req, res }: trpcExpress.CreateExpressContextOptions) => ({ req, res })

export type Context = inferAsyncReturnType<typeof createContext>

export const t = initTRPC.context<Context>().create()
