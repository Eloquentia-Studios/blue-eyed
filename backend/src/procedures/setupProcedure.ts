import { TRPCError } from '@trpc/server'
import { isSetupComplete } from '../services/setup.js'
import { t } from '../services/trpc.js'

const setupProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (await isSetupComplete()) throw new TRPCError({ code: 'FORBIDDEN', message: 'Setup already completed.' })

  return next({
    ctx
  })
})

export default setupProcedure
