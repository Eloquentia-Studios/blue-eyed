import { TRPCError } from '@trpc/server'
import type { Request, Response } from 'express'
import { sessionTime } from '../../constants/time'
import sendExpressAndLogError from '../../libs/sendAndLogError'
import trpcToExpressError from '../../libs/trpcToExpressError'
import { getAuthorizedTokenFromRedirect } from '../../services/authentication'
import logger from '../../services/logging'

const callbackRoute = async (req: Request, res: Response) => {
  try {
    logger.debug(`Callback route called: ${req.url}`)

    const redirectToken = req.query.redirectToken
    logger.debug(`Redirect token ${redirectToken}`)
    // if (typeof redirectToken !== 'string') return res.status(400).send('Invalid redirect token')
    if (typeof redirectToken !== 'string') return sendExpressAndLogError(res, 400, 'Invalid redirect token', `Someone tried to use an invalid redirect token.`)

    const redirect = req.query.redirect
    logger.debug(`Redirect address ${redirect} for token ${redirectToken}`)
    if (typeof redirect !== 'string') return sendExpressAndLogError(res, 400, 'Invalid redirect address', `Someone tried to use an invalid redirect address`)

    const token = await getAuthorizedTokenFromRedirect(redirectToken)
    logger.debug(`Token ${token} for redirect token ${redirectToken}`)
    if (!token) return sendExpressAndLogError(res, 400, 'Invalid redirect token', `Someone tried to use an invalid redirect token.`)

    logger.debug(`Setting cookie for token ${token}`)
    res.set('Set-Cookie', `blue-eyed-token=${token}; Path=/; Max-Age=${sessionTime.cache}; HttpOnly; Secure;`)

    logger.debug(`Redirecting to ${redirect}`)
    res.redirect(redirect)
  } catch (err) {
    logger.error(`Internal server error at callback route: ${err}`)

    if (err instanceof TRPCError) {
      const error = trpcToExpressError(err)
      return res.status(error.status).send(error.message)
    }
    res.status(500).send('Internal server error')
  }
}

export default callbackRoute
