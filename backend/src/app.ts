import 'dotenv/config'
import './env' // We want to be sure this is the first thing run (after dotenv)

import Cache from './services/cache'
import ExpressService from './services/express'

ExpressService.init()
Cache.init()
