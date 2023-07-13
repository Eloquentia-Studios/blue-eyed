import throwAndLogTRPCError from '../../libs/throwAndLogTRPCError'
import setupProcedure from '../../procedures/setupProcedure'
import logger from '../../services/logging'
import { completeSetup } from '../../services/setup'
import { UserRegistrationSchema, createUser } from '../../services/user'

const setupAdminRoute = setupProcedure.input(UserRegistrationSchema).mutation(async ({ ctx, input }) => {
  logger.info('Setting up first admin user via setup procedure.')

  const user = await createUser(input)
  if (!user) throwAndLogTRPCError('INTERNAL_SERVER_ERROR', 'Failed to create user.', 'Something went wrong while trying to create the Admin user.', 'error')

  await completeSetup()
  logger.info('Setup procedure completed.')
})

export default setupAdminRoute
