import type { Request } from 'express'
import { validateAuthorizedToken } from '../services/authentication.js'
import getCookie from './getCookie.js'

const checkRequestToken = (req: Request) => {
  const token = getCookie(req, 'blue-eyed-token')
  if (!token) return false

  return validateAuthorizedToken(token)
    .then(() => true)
    .catch(() => false)
}

export default checkRequestToken
