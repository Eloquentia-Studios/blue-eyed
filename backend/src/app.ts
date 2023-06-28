import 'dotenv/config'
import { initCache } from './services/cache.js'
import { initExpress } from './services/express.js'

initExpress()
initCache()
