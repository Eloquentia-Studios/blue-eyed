import { t } from '../services/trpc'
import { authorizationRouter } from './authorizationRouter'
import { setupRouter } from './setupRouter'
import { userRouter } from './userRouter'

export const appRouter = t.mergeRouters(authorizationRouter, setupRouter, userRouter)

export type AppRouter = typeof appRouter
