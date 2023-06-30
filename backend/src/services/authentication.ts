import generateRandomString from '../libs/generateRandomString.js'
import { getCache, setCache } from './cache.js'
import { getUserById } from './user.js'

export const createAuthorizedToken = async (userId: string) => {
  const token = generateRandomString()

  const ttl = 60 * 60 * 24 * 7 // 7 days
  const res = await setCache(token, userId, { ttl })
  return token
}

export const validateAuthorizedToken = async (token: string) => {
  const userId = await getCache<string>(token)
  if (!userId) return false

  const user = await getUserById(userId)
  if (!user) return false

  return true
}

export const createRedirectToken = async (token: string) => {
  const redirectToken = generateRandomString(32)

  const ttl = 10 // 10 seconds
  const res = await setCache(redirectToken, token, { ttl })
  return redirectToken
}

export const getAuthorizedTokenFromRedirect = async (redirectToken: string) => {
  const token = await getCache<string>(redirectToken)
  if (!token) throw new Error('Invalid redirect token')
  return token
}
