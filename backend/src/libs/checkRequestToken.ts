import type { Request } from 'express'
import { validateAuthorizedToken } from '../services/authentication.js'
import getCookie from './getCookie.js'

const checkRequestToken = async (req: Request) => {
  const token = getCookie(req, 'blue-eyed-token')
  if (!token) return false

  return validateAuthorizedToken(token)
}

export default checkRequestToken
