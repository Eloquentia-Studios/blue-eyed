import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { sessionTime } from '../../constants/time'
import { createAuthorizedToken, createRedirectToken } from '../../services/authentication'
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
    const userId = await getUserIdByUsername(input.username)
    if (!userId) throw new TRPCError({ message: 'Invalid username and/or password.', code: 'UNAUTHORIZED' })

    const valid = await verifyUser(userId, input.password)
    if (!valid) throw new TRPCError({ message: 'Invalid username and/or password.', code: 'UNAUTHORIZED' })

    const token = await createAuthorizedToken(userId)
    res.set('Set-Cookie', `blue-eyed-token=${token}; Path=/; Max-Age=${sessionTime.cookie}; HttpOnly; SameSite=Strict; Secure;`)

    const redirectToken = await createRedirectToken(token)
    return { redirectToken }
  })

export default authorizeRoute
