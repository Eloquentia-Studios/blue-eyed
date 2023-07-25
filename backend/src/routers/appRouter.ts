import { t } from '../services/trpc'
import { authorizationRouter } from './authorizationRouter'
import { permissionRouter } from './permissionRouter'
import { setupRouter } from './setupRouter'
import { userRouter } from './userRouter'

export const appRouter = t.mergeRouters(authorizationRouter, setupRouter, userRouter, permissionRouter)

export type AppRouter = typeof appRouter
