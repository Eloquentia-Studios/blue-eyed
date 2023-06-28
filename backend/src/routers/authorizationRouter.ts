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
    .mutation(async ({ input }) => {
      const valid = checkCredentials(input.username, input.password)
      if (!valid) throw new TRPCError({ message: 'Invalid username and/or password.', code: 'UNAUTHORIZED' })

      const token = await createAuthorizedToken(input.username)
      return { token }
    })
})
