import { z } from 'zod'
import throwAndLogTRPCError from '../../libs/throwAndLogTRPCError'
import authenticatedProcedure from '../../procedures/authenticatedProcedure'
import logger from '../../services/logging'
import Privilege from '../../services/privilege'
import { deleteUser } from '../../services/user'

const deleteUserRoute = authenticatedProcedure.input(z.string()).mutation(async ({ ctx: { user }, input: userIdToDelete }) => {
  const canDeleteUser = await Privilege.userHasHigherPrivilege(user.id, userIdToDelete, ['USERS_DELETE'])
  if (!canDeleteUser) return throwAndLogTRPCError('FORBIDDEN', 'You do not have permission to delete this user', `${user.username} tried to delete user with id: ${userIdToDelete}`)

  logger.verbose(`Trying to delete user with id: ${userIdToDelete}`)

  const deletedUser = await deleteUser(userIdToDelete)
  logger.verbose(`User ${deletedUser.displayName} (${userIdToDelete}) deleted`)
})

export default deleteUserRoute
