import throwAndLogTRPCError from '../../libs/throwAndLogTRPCError'
import setupProcedure from '../../procedures/setupProcedure'
import logger from '../../services/logging'
import RoleService from '../../services/role'
import SetupService from '../../services/setup'
import { UserRegistrationSchema, createUser } from '../../services/user'

const setupAdminRoute = setupProcedure.input(UserRegistrationSchema).mutation(async ({ input }) => {
  logger.info('Setting up first admin user via setup procedure.')

  await RoleService.createDefault()

  const superAdminRole = await RoleService.getByName('SuperAdmin')
  if (!superAdminRole) return throwAndLogTRPCError('INTERNAL_SERVER_ERROR', 'Failed to create user.', 'Something went wrong while trying to create the Admin user.', 'error')

  const user = await createUser(input, [superAdminRole.id])
  if (!user) throwAndLogTRPCError('INTERNAL_SERVER_ERROR', 'Failed to create user.', 'Something went wrong while trying to create the Admin user.', 'error')

  await SetupService.markComplete()
  logger.info('Setup procedure completed.')
})

export default setupAdminRoute
