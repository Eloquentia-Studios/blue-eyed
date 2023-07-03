import { cacheTime, sessionTime } from '../constants/time'
import generateRandomString from '../libs/generateRandomString'
import { getCache, setCache } from './cache'
import { getLastPasswordReset, getUserById } from './user'

export const createAuthorizedToken = async (userId: string) => {
  const token = generateRandomString()
  await setCache(token, { userId, createdAt: Date.now() }, { ttl: sessionTime.cache })
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

  await setCache(redirectToken, token, { ttl: cacheTime.second * 10 })
  return redirectToken
}

export const getAuthorizedTokenFromRedirect = async (redirectToken: string) => {
  const token = await getCache<string>(redirectToken)
  if (!token) throw new Error('Invalid redirect token')
  return token
}
