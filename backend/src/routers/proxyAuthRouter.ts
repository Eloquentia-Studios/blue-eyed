import { Router } from 'express'
import authCheckTraefik from '../routes/authCheckTraefik'

const proxyAuthRouter = Router()

proxyAuthRouter.use('/traefik', authCheckTraefik)

export default proxyAuthRouter
