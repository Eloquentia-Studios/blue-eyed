import { z } from 'zod'
import throwAndLogTRPCError from '../../libs/throwAndLogTRPCError'
import { invalidateInvitationToken, validateInvitationToken } from '../../services/invitation'
import logger from '../../services/logging'
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
    logger.info('Someone is trying to register a new user account.')
    logger.debug(`Someone is trying to register a new user account ${registrationInfo.username} (${registrationInfo.email}).`)

    if (!(await validateInvitationToken(invitationToken))) return throwAndLogTRPCError('UNAUTHORIZED', 'Invalid invitation token', 'Someone tried to register with an invalid invitation token.', 'warn')

    await createUser(registrationInfo)
    await invalidateInvitationToken(invitationToken)

    logger.info(`User ${registrationInfo.username} has been registered.`)
  })

export default registerUserRoute
