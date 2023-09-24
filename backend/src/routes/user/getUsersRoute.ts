import authenticatedProcedure from '../../procedures/authenticatedProcedure'
import logger from '../../services/logging'
import UserService from '../../services/user'

const getUsersRoute = authenticatedProcedure.query(async () => {
  logger.verbose(`Someone is trying to get all users`)

  const users = await UserService.getAll()
  logger.debug(`Returning ${users.length} users to front-end`)

  return users
})

export default getUsersRoute
