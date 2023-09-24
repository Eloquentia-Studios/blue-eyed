import { z } from 'zod'
import throwAndLogTRPCError from '../../libs/throwAndLogTRPCError'
import { UserRegistrationSchema } from '../../schemas/User'
import InvitationService from '../../services/invitation'
import logger from '../../services/logging'
import { t } from '../../services/trpc'
import UserService from '../../services/user'

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

    if (!(await InvitationService.validateToken(invitationToken))) return throwAndLogTRPCError('UNAUTHORIZED', 'Invalid invitation token', 'Someone tried to register with an invalid invitation token.', 'warn')

    await UserService.create(registrationInfo)
    await InvitationService.invalidateToken(invitationToken)

    logger.info(`User ${registrationInfo.username} has been registered.`)
  })

export default registerUserRoute
