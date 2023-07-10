import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import authenticatedProcedure from '../procedures/authenticatedProcedure'
import { generateInvitationToken, invalidateInvitationToken, validateInvitationToken } from '../services/invitation'
import { t } from '../services/trpc'
import { PasswordSchema, UserRegistrationSchema, createUser, deleteUser, generateResetToken, getUserFromRequest, getUserIdByResetToken, getUsers, invalidateResetToken, setUserPassword } from '../services/user'

export const userRouter = t.router({
  getUsers: authenticatedProcedure.query(() => getUsers()),
  createUserInvitation: authenticatedProcedure.mutation(() => generateInvitationToken()),
  registerUser: t.procedure
    .input(
      z.object({
        invitationToken: z.string(),
        registrationInfo: UserRegistrationSchema
      })
    )
    .mutation(async ({ input: { registrationInfo, invitationToken } }) => {
      if (!(await validateInvitationToken(invitationToken))) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid invitation token' })

      await createUser(registrationInfo)
      await invalidateInvitationToken(invitationToken)
    }),
  deleteUser: authenticatedProcedure.input(z.string()).mutation(async ({ input: userId }) => deleteUser(userId)),
  resetUserPassword: t.procedure.input(z.object({ resetToken: z.string(), password: PasswordSchema })).mutation(async ({ input: { resetToken, password } }) => {
    const userId = await getUserIdByResetToken(resetToken)
    if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid reset token' })

    await setUserPassword(userId, password)
    await invalidateResetToken(resetToken)
  }),
  requestPasswordReset: authenticatedProcedure.input(z.string()).mutation(({ input: userId }) => generateResetToken(userId)),
  getCurrentUser: t.procedure.query(({ ctx }) => getUserFromRequest(ctx.req))
})
