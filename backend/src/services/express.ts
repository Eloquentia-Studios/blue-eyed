import * as trpcExpress from '@trpc/server/adapters/express'
import express from 'express'
import { ENV } from '../env'
import { appRouter } from '../routers/appRouter'
import expressAuthorizationRouter from '../routers/expressAuthorizationRouter'
import proxyAuthRouter from '../routers/proxyAuthRouter'
import logger from './logging'
import { createContext } from './trpc'

export default class ExpressService {
  static app = express()

  public static async init() {
    logger.debug('Initializing express')

    logger.debug('Setting up express middleware')
    this.app.use(
      '/trpc',
      trpcExpress.createExpressMiddleware({
        router: appRouter,
        createContext
      })
    )

    this.app.use('/auth/', proxyAuthRouter)
    this.app.use('/auth.blue-eyed', expressAuthorizationRouter)

    this.setupStaticServer()

    logger.debug(`Trying to listen on port ${ENV.PORT}`)
    this.app.listen(ENV.PORT, () => logger.info(`Listening on port ${ENV.PORT}`))
  }

  private static async setupStaticServer() {
    logger.debug('Setting up static server')
    this.app.use(express.static('../frontend/build'))
    this.app.get('*', (_, res) => res.sendFile('index.html', { root: '../frontend/build' }))
  }
}
