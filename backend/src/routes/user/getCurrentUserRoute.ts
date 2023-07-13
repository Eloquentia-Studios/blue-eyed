import { t } from '../../services/trpc'
import { getUserFromRequest } from '../../services/user'

const getCurrentUserRoute = t.procedure.query(({ ctx }) => getUserFromRequest(ctx.req))

export default getCurrentUserRoute
