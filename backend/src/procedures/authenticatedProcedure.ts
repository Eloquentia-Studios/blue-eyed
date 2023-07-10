import { TRPCError } from '@trpc/server'
import { t } from '../services/trpc'
import { getUserFromRequest } from '../services/user'

const authenticatedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const user = await getUserFromRequest(ctx.req)
  if (!user) throw new TRPCError({ message: 'Unauthorized authentication token', code: 'UNAUTHORIZED' })
  return next({ ctx: { ...ctx, user } })
})

export default authenticatedProcedure
