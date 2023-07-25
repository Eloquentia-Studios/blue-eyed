import * as trpcExpress from '@trpc/server/adapters/express'
import type { Express } from 'express'
import express from 'express'
import { ENV } from '../env'
import { appRouter } from '../routers/appRouter'
import expressAuthorizationRouter from '../routers/expressAuthorizationRouter'
import proxyAuthRouter from '../routers/proxyAuthRouter'
import logger from './logging'
import { createContext } from './trpc'

export const initExpress = () => {
  const app = express()
  logger.debug('Initializing express')

  logger.debug('Setting up express middleware')
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

  logger.debug(`Trying to listen on port ${ENV.PORT}`)
  app.listen(ENV.PORT, () => logger.info(`Listening on port ${ENV.PORT}`))
}

const setupStaticServer = (app: Express) => {
  logger.debug('Setting up static server')
  app.use(express.static('../frontend/build'))
  app.get('*', (_, res) => res.sendFile('index.html', { root: '../frontend/build' }))
}
