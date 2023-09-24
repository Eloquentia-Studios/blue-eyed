import 'dotenv/config'
import './env' // We want to be sure this is the first thing run (after dotenv)

import Cache from './services/cache'
import { initExpress } from './services/express'

initExpress()
Cache.init()
