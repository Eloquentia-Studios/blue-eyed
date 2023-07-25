import { z } from 'zod'
import throwAndLogTRPCError from '../../libs/throwAndLogTRPCError'
import logging from '../../services/logging'
import { t } from '../../services/trpc'
import { PasswordSchema, getUserIdByResetToken, invalidateResetToken, setUserPassword } from '../../services/user'

const resetUserPasswordRoute = t.procedure.input(z.object({ resetToken: z.string(), password: PasswordSchema })).mutation(async ({ input: { resetToken, password } }) => {
  logging.verbose('Someone requested a user password to be reset.')
  logging.debug(`Password reset requested with token: ${resetToken}`)

  const userId = await getUserIdByResetToken(resetToken)
  if (!userId) return throwAndLogTRPCError('UNAUTHORIZED', 'Invalid reset token', 'Someone tried to reset a password with an invalid reset token.', 'warn')
  logging.debug(`Password reset requested for user: ${userId}`)

  await setUserPassword(userId, password)
  await invalidateResetToken(resetToken)

  logging.verbose(`User ${userId} password has been reset.`)
})

export default resetUserPasswordRoute
