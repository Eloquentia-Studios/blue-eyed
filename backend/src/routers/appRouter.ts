import { t } from '../services/trpc.js'
import { authorizationRouter } from './authorizationRouter.js'
import { setupRouter } from './setupRouter.js'
import { userRouter } from './userRouter.js'

export const appRouter = t.mergeRouters(authorizationRouter, setupRouter, userRouter)

export type AppRouter = typeof appRouter
