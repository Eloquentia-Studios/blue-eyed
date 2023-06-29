import { t } from '../services/trpc.js'
import { authorizationRouter } from './authorizationRouter.js'
import { setupRouter } from './setupRouter.js'

export const appRouter = t.mergeRouters(authorizationRouter, setupRouter)

export type AppRouter = typeof appRouter
