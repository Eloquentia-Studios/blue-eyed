import type { Request, Response } from 'express'
import getCookie from '../../libs/getCookie'
import getForwardedHost from '../../libs/getForwardedHost'
import getServiceHostname from '../../libs/getServiceHostname'
import { validateAuthorizedToken } from '../../services/authentication'

const authCheckTraefik = async (req: Request, res: Response) => {
  const authenticationUrl = getAuthenticationUrl(req)

  const token = getCookie(req, 'blue-eyed-token')
  if (!token) return res.redirect(authenticationUrl)

  const valid = await validateAuthorizedToken(token)
  if (!valid) return res.redirect(authenticationUrl)

  res.status(200).send('OK')
}

const getAuthenticationUrl = (req: Request) => `${getServiceHostname()}/authorization?redirect=${encodeURIComponent(getForwardedHost(req))}`

export default authCheckTraefik
