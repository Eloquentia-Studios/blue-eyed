import throwAndLogTRPCError from '../libs/throwAndLogTRPCError'
import { t } from '../services/trpc'
import { getUserFromRequest } from '../services/user'

const authenticatedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const user = await getUserFromRequest(ctx.req)
  if (!user) return throwAndLogTRPCError('UNAUTHORIZED', 'Unauthorized authentication token', `Someone tried to access a protected route without a valid token.`)

  return next({ ctx: { ...ctx, user } })
})

export default authenticatedProcedure
