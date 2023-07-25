import { z } from 'zod'
import authenticatedProcedure from '../../procedures/authenticatedProcedure'
import logging from '../../services/logging'
import { generateResetToken } from '../../services/user'

const requestPasswordResetRoute = authenticatedProcedure.input(z.string()).mutation(async ({ input: userId }) => {
  logging.verbose('Someone requested a password reset')
  logging.debug(`Requesting a password reset token for user ${userId}`)

  const resetToken = generateResetToken(userId)
  logging.debug(`Returning reset token ${resetToken} for user ${userId}`)

  return resetToken
})

export default requestPasswordResetRoute
