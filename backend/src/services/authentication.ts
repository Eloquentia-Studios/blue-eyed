import generateRandomString from '../libs/generateRandomString.js'
import { getCache, setCache } from './cache.js'
import { getLastPasswordReset, getUserById } from './user.js'

export const createAuthorizedToken = async (userId: string) => {
  const token = generateRandomString()

  const ttl = 60 * 60 * 24 * 7 // 7 days
  const res = await setCache(token, { userId, createdAt: Date.now() }, { ttl })
  return token
}

export const validateAuthorizedToken = async (token: string) => {
  const res = await getCache<{ userId: string; createdAt: number }>(token)
  if (!res) return false

  const { userId, createdAt } = res

  const user = await getUserById(userId)
  if (!user) return false

  const lastPasswordReset = await getLastPasswordReset(userId)
  if (lastPasswordReset && lastPasswordReset > createdAt) return false

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
