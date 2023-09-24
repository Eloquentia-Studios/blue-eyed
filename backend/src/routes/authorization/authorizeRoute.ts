import { z } from 'zod'
import { sessionTime } from '../../constants/time'
import throwAndLogTRPCError from '../../libs/throwAndLogTRPCError'
import AuthenticationService from '../../services/authentication'
import logger from '../../services/logging'
import RedirectionService from '../../services/redirection'
import { t } from '../../services/trpc'
import UserService from '../../services/user'

const authorizeRoute = t.procedure
  .input(
    z.object({
      username: z.string(),
      password: z.string()
    })
  )
  .mutation(async ({ input, ctx: { res } }) => {
    logger.verbose(`Trying to authorize user ${input.username}`)

    const user = await UserService.getByUsername(input.username)
    logger.debug(`User ${input.username} has id ${user?.id}`)
    if (!user) return throwAndLogTRPCError('UNAUTHORIZED', 'Invalid username and/or password.', `User ${input.username} does not exist.`)
    const { id: userId } = user

    const valid = await UserService.verifyPassword(userId, input.password)
    logger.debug(`User ${input.username} has valid password: ${valid}`)
    if (!valid) return throwAndLogTRPCError('UNAUTHORIZED', 'Invalid username and/or password.', `User ${input.username} provided invalid password.`)

    const token = await AuthenticationService.createToken(userId)
    logger.debug(`User ${input.username} has token ${token}`)
    res.set('Set-Cookie', `blue-eyed-token=${token}; Path=/; Max-Age=${sessionTime.cookie}; HttpOnly; SameSite=Strict; Secure;`)

    const redirectToken = await RedirectionService.createToken(token)
    logger.debug(`User ${input.username} has redirect token ${redirectToken}`)

    logger.verbose(`User ${input.username} successfully authorized`)

    return { redirectToken }
  })

export default authorizeRoute
