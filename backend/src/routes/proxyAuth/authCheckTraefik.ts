import type { Request, Response } from 'express'
import getCookie from '../../libs/getCookie'
import getForwardedHost from '../../libs/getForwardedHost'
import getServiceHostname from '../../libs/getServiceHostname'
import { validateAuthorizedToken } from '../../services/authentication'
import logger from '../../services/logging'

const authCheckTraefik = async (req: Request, res: Response) => {
  const authenticationUrl = getAuthenticationUrl(req)
  logger.debug(`Checking authentication for ${req.url} via Traefik.`)

  const token = getCookie(req, 'blue-eyed-token')
  if (!token) {
    logger.verbose(`Someone tried to access ${req.url} without a token.`)
    logger.debug(`Redirecting to ${authenticationUrl} because no token was found.`)

    return res.redirect(authenticationUrl)
  }

  const valid = await validateAuthorizedToken(token)
  if (!valid) {
    logger.verbose(`Someone tried to access ${req.url} with an invalid token.`)
    logger.debug(`Redirecting to ${authenticationUrl} because the token was invalid.`)

    return res.redirect(authenticationUrl)
  }

  logger.verbose(`Someone successfully accessed ${req.url}.`)
  res.status(200).send('OK')
}

const getAuthenticationUrl = (req: Request) => `${getServiceHostname()}/authorization?redirect=${encodeURIComponent(getForwardedHost(req))}`

export default authCheckTraefik
