import permissionProcedure from '../../procedures/permissionProcedure'
import { generateInvitationToken } from '../../services/invitation'
import logger from '../../services/logging'

const createUserInvitationRoute = permissionProcedure(['USERS_INVITE']).mutation(() => {
  logger.verbose('Someone requested a new invitation token.')
  const invitationToken = generateInvitationToken()
  logger.debug(`Returning new invitation token (${invitationToken}) to front-end.`)
  return invitationToken
})

export default createUserInvitationRoute
