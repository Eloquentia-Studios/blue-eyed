import * as trpcExpress from '@trpc/server/adapters/express'
import type { Express } from 'express'
import express from 'express'
import { appRouter } from '../routers/appRouter'
import expressAuthorizationRouter from '../routers/expressAuthorizationRouter'
import proxyAuthRouter from '../routers/proxyAuthRouter'
import { createContext } from './trpc'

export const initExpress = () => {
  const app = express()

  app.use(
    '/trpc',
    trpcExpress.createExpressMiddleware({
      router: appRouter,
      createContext
    })
  )

  app.use('/auth/', proxyAuthRouter)
  app.use('/auth.blue-eyed', expressAuthorizationRouter)

  setupStaticServer(app)

  const PORT = process.env.PORT || 3000
  app.listen(PORT, () => console.log('Listening on port 3000'))
}

const setupStaticServer = (app: Express) => {
  app.use(express.static('../frontend/build'))
  app.get('*', (_, res) => {
    res.sendFile('index.html', { root: '../frontend/build' })
  })
}
