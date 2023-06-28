import { t } from '../services/trpc.js'
import { authorizationRouter } from './authorizationRouter.js'

export const appRouter = t.mergeRouters(authorizationRouter)

export type AppRouter = typeof appRouter
