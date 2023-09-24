import { z } from 'zod'
import throwAndLogTRPCError from '../../libs/throwAndLogTRPCError'
import authenticatedProcedure from '../../procedures/authenticatedProcedure'
import logger from '../../services/logging'
import PrivilegeService from '../../services/privilege'
import UserService from '../../services/user'

const deleteUserRoute = authenticatedProcedure.input(z.string()).mutation(async ({ ctx: { user }, input: userIdToDelete }) => {
  const canDeleteUser = await PrivilegeService.userHasHigherPrivilege(user.id, userIdToDelete, ['USERS_DELETE'])
  if (!canDeleteUser) return throwAndLogTRPCError('FORBIDDEN', 'You do not have permission to delete this user', `${user.username} tried to delete user with id: ${userIdToDelete}`)

  logger.verbose(`Trying to delete user with id: ${userIdToDelete}`)

  const deletedUser = await UserService.delete(userIdToDelete)
  logger.verbose(`User ${deletedUser.displayName} (${userIdToDelete}) deleted`)
})

export default deleteUserRoute
