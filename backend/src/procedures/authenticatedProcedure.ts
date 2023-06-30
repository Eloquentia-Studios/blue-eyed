import { TRPCError } from '@trpc/server'
import checkRequestToken from '../libs/checkRequestToken.js'
import { t } from '../services/trpc.js'

const authenticatedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const validToken = await checkRequestToken(ctx.req)
  if (!validToken) throw new TRPCError({ message: 'Unauthorized', code: 'UNAUTHORIZED' })
  return next({ ctx })
})

export default authenticatedProcedure
