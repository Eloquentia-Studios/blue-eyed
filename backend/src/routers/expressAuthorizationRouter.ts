import { TRPCError } from '@trpc/server'
import { Router } from 'express'
import trpcToExpressError from '../libs/trpcToExpressError'
import { getAuthorizedTokenFromRedirect } from '../services/authentication'

const expressAuthorizationRouter = Router()

expressAuthorizationRouter.get('/callback', async (req, res) => {
  try {
    const redirectToken = req.query.redirectToken
    if (typeof redirectToken !== 'string') return res.status(400).send('Invalid redirect token')

    const redirect = req.query.redirect
    if (typeof redirect !== 'string') return res.status(400).send('Invalid redirect')

    const token = await getAuthorizedTokenFromRedirect(redirectToken)

    if (!token) return res.status(400).send('Invalid redirect token')

    res.set('Set-Cookie', `blue-eyed-token=${token}; Path=/; HttpOnly; Secure;`)
    res.redirect(redirect)
  } catch (err) {
    if (err instanceof TRPCError) {
      const error = trpcToExpressError(err)
      return res.status(error.status).send(error.message)
    }
    res.status(500).send('Internal server error')
  }
})

export default expressAuthorizationRouter
