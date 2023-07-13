import { TRPCError } from '@trpc/server'
import setupProcedure from '../../procedures/setupProcedure'
import { completeSetup } from '../../services/setup'
import { UserRegistrationSchema, createUser } from '../../services/user'

const setupAdminRoute = setupProcedure.input(UserRegistrationSchema).mutation(async ({ ctx, input }) => {
  const user = await createUser(input)
  if (!user) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create user.' })

  await completeSetup()
})

export default setupAdminRoute
