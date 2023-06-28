import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { checkCredentials, createAuthorizedToken } from '../services/authentication.js'
import { t } from '../services/trpc.js'

export const authorizationRouter = t.router({
  authorize: t.procedure
    .input(
      z.object({
        username: z.string(),
        password: z.string()
      })
    )
    .mutation(async ({ input, ctx: { res } }) => {
      const valid = checkCredentials(input.username, input.password)
      if (!valid) throw new TRPCError({ message: 'Invalid username and/or password.', code: 'UNAUTHORIZED' })

      const token = await createAuthorizedToken(input.username)
      res.set('Set-Cookie', `blue-eyed-token=${token}; Path=/; HttpOnly; SameSite=Strict; Secure`)
    })
})
