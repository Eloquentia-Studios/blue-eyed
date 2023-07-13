import { Router } from 'express'
import callbackRoute from '../routes/expressAuthorization/callbackRoute'

const expressAuthorizationRouter = Router()

expressAuthorizationRouter.get('/callback', callbackRoute)

export default expressAuthorizationRouter
