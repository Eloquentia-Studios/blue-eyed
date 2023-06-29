import type { Request, Response } from 'express'
import getForwardedHost from '../libs/getForwardedHost.js'
import getServiceHostname from '../libs/getServiceHostname.js'

const authCheckTraefik = (req: Request, res: Response) => {
  const authenticationUrl = `${getServiceHostname()}/authorization?redirect=${encodeURIComponent(getForwardedHost(req))}`
  const cookie = req.headers.cookie
  if (!cookie) return res.redirect(authenticationUrl)

  res.status(200).send('OK')
}

export default authCheckTraefik
