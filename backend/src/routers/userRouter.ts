import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import authenticatedProcedure from '../procedures/authenticatedProcedure.js'
import { generateInvitationToken, invalidateInvitationToken, validateInvitationToken } from '../services/invitation.js'
import { t } from '../services/trpc.js'
import { UserRegistrationSchema, createUser, getUsers } from '../services/user.js'

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
    })
})
