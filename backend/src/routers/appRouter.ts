import { t } from '../services/trpc'
import { authorizationRouter } from './authorizationRouter'
import { permissionRouter } from './permissionRouter'
import { roleRouter } from './roleRouter'
import { setupRouter } from './setupRouter'
import { userRouter } from './userRouter'

export const appRouter = t.mergeRouters(authorizationRouter, setupRouter, userRouter, permissionRouter, roleRouter)

export type AppRouter = typeof appRouter
