import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { t } from '../../services/trpc'
import { PasswordSchema, getUserIdByResetToken, invalidateResetToken, setUserPassword } from '../../services/user'

const resetUserPasswordRoute = t.procedure.input(z.object({ resetToken: z.string(), password: PasswordSchema })).mutation(async ({ input: { resetToken, password } }) => {
  const userId = await getUserIdByResetToken(resetToken)
  if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid reset token' })

  await setUserPassword(userId, password)
  await invalidateResetToken(resetToken)
})

export default resetUserPasswordRoute
