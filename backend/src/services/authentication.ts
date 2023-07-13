import type { Request } from 'express'
import { z } from 'zod'
import { cacheTime, sessionTime } from '../constants/time'
import generateRandomString from '../libs/generateRandomString'
import getCookie from '../libs/getCookie'
import { getCache, setCache } from './cache'
import { getLastPasswordReset, getUserById } from './user'

const userTokenSchema = z.object({
  userId: z.string().uuid(),
  createdAt: z.number().positive().int()
})

type UserTokenData = z.infer<typeof userTokenSchema>

export const createAuthorizedToken = async (userId: string) => {
  const token = generateRandomString()
  const createdAt = Date.now()

  // Want to make sure that tokens look the way we expect them too, or they could create issues
  const validatedData = await userTokenSchema.parseAsync({ userId, createdAt })

  await setCache(token, validatedData, { ttl: sessionTime.cache })
  return token
}

export const validateAuthorizedToken = async (token: string) => ((await getUserTokenData(token)) ? true : false)

export const createRedirectToken = async (token: string) => {
  const redirectToken = generateRandomString(32)

  await setCache(redirectToken, token, { ttl: cacheTime.second * 10 })
  return redirectToken
}

export const getAuthorizedTokenFromRedirect = async (redirectToken: string) => {
  const token = await getCache<string>(redirectToken)
  if (!token || typeof token !== 'string') return null
  return token
}

export const getRequestUserTokenData = async (req: Request) => {
  const token = getCookie(req, 'blue-eyed-token')
  if (!token) return null

  return getUserTokenData(token)
}

const getUserTokenData = async (token: string) => {
  const res = await getCache<UserTokenData>(token)
  if (!res) return null

  const parseResult = await userTokenSchema.safeParseAsync(res)
  if (!parseResult.success) return null

  const { userId, createdAt } = res

  const user = await getUserById(userId)
  if (!user) return null

  const lastPasswordReset = await getLastPasswordReset(userId)
  if (lastPasswordReset && lastPasswordReset > createdAt) return null

  return parseResult.data
}
