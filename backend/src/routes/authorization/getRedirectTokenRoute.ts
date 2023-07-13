import { TRPCError } from '@trpc/server'
import getCookie from '../../libs/getCookie'
import authenticatedProcedure from '../../procedures/authenticatedProcedure'
import { createRedirectToken } from '../../services/authentication'

const getRedirectTokenRoute = authenticatedProcedure.mutation(async ({ ctx: { req } }) => {
  const tokenCookie = getCookie(req, 'blue-eyed-token')
  if (!tokenCookie) throw new TRPCError({ message: 'Unauthorized', code: 'UNAUTHORIZED' })

  const redirectToken = await createRedirectToken(tokenCookie)
  return { redirectToken }
})

export default getRedirectTokenRoute
