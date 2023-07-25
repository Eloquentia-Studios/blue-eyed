import { z } from 'zod'
import authenticatedProcedure from '../../procedures/authenticatedProcedure'
import logger from '../../services/logging'
import { deleteUser } from '../../services/user'

const deleteUserRoute = authenticatedProcedure.input(z.string()).mutation(async ({ input: userId }) => {
  logger.verbose(`Trying to delete user with id: ${userId}`)

  const user = await deleteUser(userId)
  logger.verbose(`User ${user.displayName} (${userId}) deleted`)
})

export default deleteUserRoute
