import { TRPCError } from '@trpc/server'
import setupProcedure from '../procedures/setupProcedure.js'
import { completeSetup, isSetupComplete } from '../services/setup.js'
import { t } from '../services/trpc.js'
import { UserRegistrationSchema, createUser } from '../services/user.js'

export const setupRouter = t.router({
  setupAdmin: setupProcedure.input(UserRegistrationSchema).mutation(async ({ ctx, input }) => {
    const user = await createUser(input)
    if (!user) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create user.' })

    await completeSetup()
  }),
  setupIncomplete: t.procedure.query(async () => !(await isSetupComplete()))
})
