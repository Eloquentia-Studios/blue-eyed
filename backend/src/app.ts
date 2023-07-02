import 'dotenv/config'
import { initCache } from './services/cache'
import { initExpress } from './services/express'

initExpress()
initCache()
