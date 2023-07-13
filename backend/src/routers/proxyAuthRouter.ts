import { Router } from 'express'
import authCheckTraefik from '../routes/proxyAuth/authCheckTraefik'

const proxyAuthRouter = Router()

proxyAuthRouter.use('/traefik', authCheckTraefik)

export default proxyAuthRouter
