import { TRPCError } from '@trpc/server'
import type { Request, Response } from 'express'
import { sessionTime } from '../../constants/time'
import trpcToExpressError from '../../libs/trpcToExpressError'
import { getAuthorizedTokenFromRedirect } from '../../services/authentication'

const callbackRoute = async (req: Request, res: Response) => {
  try {
    const redirectToken = req.query.redirectToken
    if (typeof redirectToken !== 'string') return res.status(400).send('Invalid redirect token')

    const redirect = req.query.redirect
    if (typeof redirect !== 'string') return res.status(400).send('Invalid redirect')

    const token = await getAuthorizedTokenFromRedirect(redirectToken)

    if (!token) return res.status(400).send('Invalid redirect token')

    res.set('Set-Cookie', `blue-eyed-token=${token}; Path=/; Max-Age=${sessionTime.cache}; HttpOnly; Secure;`)
    res.redirect(redirect)
  } catch (err) {
    if (err instanceof TRPCError) {
      const error = trpcToExpressError(err)
      return res.status(error.status).send(error.message)
    }
    res.status(500).send('Internal server error')
  }
}

export default callbackRoute
