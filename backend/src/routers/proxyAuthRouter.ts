import { Router } from 'express'
import authCheckTraefik from '../routes/authCheckTraefik.js'

const proxyAuthRouter = Router()

proxyAuthRouter.use('/traefik', authCheckTraefik)

export default proxyAuthRouter
