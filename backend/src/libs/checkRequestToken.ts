import type { Request } from 'express'
import { validateAuthorizedToken } from '../services/authentication'
import getCookie from './getCookie'

const checkRequestToken = async (req: Request) => {
  const token = getCookie(req, 'blue-eyed-token')
  if (!token) return false

  return validateAuthorizedToken(token)
}

export default checkRequestToken
