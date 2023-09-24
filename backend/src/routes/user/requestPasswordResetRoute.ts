import { z } from 'zod'
import throwAndLogTRPCError from '../../libs/throwAndLogTRPCError'
import authenticatedProcedure from '../../procedures/authenticatedProcedure'
import logging from '../../services/logging'
import Privilege from '../../services/privilege'
import { generateResetToken } from '../../services/user'

const requestPasswordResetRoute = authenticatedProcedure.input(z.string()).mutation(async ({ ctx: { user }, input: affectedUserId }) => {
  logging.verbose('Someone requested a password reset')

  const canResetUserPassword = await Privilege.userHasHigherPrivilege(user.id, affectedUserId, ['USERS_WRITE'])
  if (!canResetUserPassword && user.id !== affectedUserId)
    return throwAndLogTRPCError('FORBIDDEN', "You do not have permission to reset this user's password", `${user.username} tried to reset the password of user with id: ${affectedUserId}`)

  logging.debug(`Requesting a password reset token for user ${affectedUserId}`)

  const resetToken = generateResetToken(affectedUserId)
  logging.debug(`Returning reset token ${resetToken} for user ${affectedUserId}`)

  return resetToken
})

export default requestPasswordResetRoute
