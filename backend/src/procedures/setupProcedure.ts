import throwAndLogTRPCError from '../libs/throwAndLogTRPCError'
import { isSetupComplete } from '../services/setup'
import { t } from '../services/trpc'

const setupProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (await isSetupComplete()) throwAndLogTRPCError('FORBIDDEN', 'Setup already completed.', 'Someone tried to access a setup route after setup was completed')

  return next({ ctx })
})

export default setupProcedure
