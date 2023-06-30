import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import checkRequestToken from '../libs/checkRequestToken.js'
import getCookie from '../libs/getCookie.js'
import authenticatedProcedure from '../procedures/authenticatedProcedure.js'
import { createAuthorizedToken, createRedirectToken } from '../services/authentication.js'
import { t } from '../services/trpc.js'
import { verifyUser } from '../services/user.js'

export const authorizationRouter = t.router({
  authorize: t.procedure
    .input(
      z.object({
        username: z.string(),
        password: z.string()
      })
    )
    .mutation(async ({ input, ctx: { res } }) => {
      const valid = await verifyUser(input.username, input.password)
      if (!valid) throw new TRPCError({ message: 'Invalid username and/or password.', code: 'UNAUTHORIZED' })

      const token = await createAuthorizedToken(input.username)
      res.set('Set-Cookie', `blue-eyed-token=${token}; Path=/; HttpOnly; SameSite=Strict; Secure;`)

      const redirectToken = await createRedirectToken(token)
      return { redirectToken }
    }),
  getRedirectToken: authenticatedProcedure.mutation(async ({ ctx: { req } }) => {
    const tokenCookie = getCookie(req, 'blue-eyed-token')
    if (!tokenCookie) throw new TRPCError({ message: 'Unauthorized', code: 'UNAUTHORIZED' })

    const redirectToken = await createRedirectToken(tokenCookie)
    return { redirectToken }
  }),
  isAuthenticated: t.procedure.query(async ({ ctx: { req } }) => checkRequestToken(req))
})
