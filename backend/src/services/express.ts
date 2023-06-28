import * as trpcExpress from '@trpc/server/adapters/express'
import express from 'express'
import { appRouter } from '../routers/appRouter.js'
import { createContext } from './trpc.js'

export const initExpress = () => {
  const app = express()

  app.use(
    '/trpc',
    trpcExpress.createExpressMiddleware({
      router: appRouter,
      createContext
    })
  )

  const PORT = process.env.PORT || 3000
  app.listen(3000, () => console.log('Listening on port 3000'))
}
