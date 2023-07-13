import { z } from 'zod'
import { sessionTime } from '../../constants/time'
import throwAndLogTRPCError from '../../libs/throwAndLogTRPCError'
import { createAuthorizedToken, createRedirectToken } from '../../services/authentication'
import logger from '../../services/logging'
import { t } from '../../services/trpc'
import { getUserIdByUsername, verifyUser } from '../../services/user'

const authorizeRoute = t.procedure
  .input(
    z.object({
      username: z.string(),
      password: z.string()
    })
  )
  .mutation(async ({ input, ctx: { res } }) => {
    logger.verbose(`Trying to authorize user ${input.username}`)

    const userId = await getUserIdByUsername(input.username)
    logger.debug(`User ${input.username} has id ${userId}`)
    if (!userId) return throwAndLogTRPCError('UNAUTHORIZED', 'Invalid username and/or password.', `User ${input.username} does not exist.`)

    const valid = await verifyUser(userId, input.password)
    logger.debug(`User ${input.username} has valid password: ${valid}`)
    if (!valid) return throwAndLogTRPCError('UNAUTHORIZED', 'Invalid username and/or password.', `User ${input.username} provided invalid password.`)

    const token = await createAuthorizedToken(userId)
    logger.debug(`User ${input.username} has token ${token}`)
    res.set('Set-Cookie', `blue-eyed-token=${token}; Path=/; Max-Age=${sessionTime.cookie}; HttpOnly; SameSite=Strict; Secure;`)

    const redirectToken = await createRedirectToken(token)
    logger.debug(`User ${input.username} has redirect token ${redirectToken}`)

    logger.verbose(`User ${input.username} successfully authorized`)

    return { redirectToken }
  })

export default authorizeRoute
