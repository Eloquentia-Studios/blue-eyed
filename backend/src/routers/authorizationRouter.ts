import authorize from '../routes/authorization/authorizeRoute'
import getRedirectToken from '../routes/authorization/getRedirectTokenRoute'
import { t } from '../services/trpc'

export const authorizationRouter = t.router({ authorize, getRedirectToken })
