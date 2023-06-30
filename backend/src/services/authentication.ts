import { TRPCError } from '@trpc/server'
import generateRandomString from '../libs/generateRandomString.js'
import { getCache, setCache } from './cache.js'

export const createAuthorizedToken = async (username: string) => {
  const token = generateRandomString()

  const ttl = 60 * 60 * 24 * 7 // 7 days
  const res = await setCache(token, username, { ttl })
  return token
}

export const validateAuthorizedToken = async (token: string) => {
  const username = await getCache<string>(token)
  if (!username) throw new TRPCError({ message: 'Invalid token.', code: 'UNAUTHORIZED' })
  return username
}

export const createRedirectToken = async (token: string) => {
  const redirectToken = generateRandomString(32)

  const ttl = 10 // 10 seconds
  const res = await setCache(redirectToken, token, { ttl })
  return redirectToken
}

export const validateRedirectToken = async (redirectToken: string) => {
  const token = await getCache<string>(redirectToken)
  if (!token) throw new TRPCError({ message: 'Invalid redirect token.', code: 'UNAUTHORIZED' })
  return token
}
