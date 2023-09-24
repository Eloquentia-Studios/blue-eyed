import getCookie from '../../libs/getCookie'
import throwAndLogTRPCError from '../../libs/throwAndLogTRPCError'
import authenticatedProcedure from '../../procedures/authenticatedProcedure'
import logger from '../../services/logging'
import RedirectionService from '../../services/redirection'

const getRedirectTokenRoute = authenticatedProcedure.mutation(async ({ ctx: { req } }) => {
  const tokenCookie = getCookie(req, 'blue-eyed-token')
  logger.debug(`Token cookie is ${tokenCookie}`)
  if (!tokenCookie) return throwAndLogTRPCError('UNAUTHORIZED', 'Unauthorized authentication token', `Token cookie does not exist`)

  const redirectToken = await RedirectionService.createToken(tokenCookie)
  logger.debug(`Redirect token is ${redirectToken} for token ${tokenCookie}`)

  return { redirectToken }
})

export default getRedirectTokenRoute
