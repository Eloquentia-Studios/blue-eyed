import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { invalidateInvitationToken, validateInvitationToken } from '../../services/invitation'
import { t } from '../../services/trpc'
import { UserRegistrationSchema, createUser } from '../../services/user'

const registerUserRoute = t.procedure
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

export default registerUserRoute
