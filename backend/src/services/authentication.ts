import type { Request } from 'express'
import { z } from 'zod'
import { cacheTime, sessionTime } from '../constants/time'
import generateRandomString from '../libs/generateRandomString'
import getCookie from '../libs/getCookie'
import { getCache, setCache } from './cache'
import logger from './logging'
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

  logger.debug(`Created authorized token for user ${userId} with token ${token}`)
  return token
}

export const validateAuthorizedToken = async (token: string) => {
  logger.debug(`Validating token ${token}`)
  const tokenData = await getUserTokenData(token)

  if (!tokenData) {
    logger.debug(`Token ${token} is invalid`)
    return false
  }

  logger.debug(`Token ${token} is valid`)
  return true
}

export const createRedirectToken = async (token: string) => {
  const redirectToken = generateRandomString(32)

  await setCache(redirectToken, token, { ttl: cacheTime.second * 10 })

  logger.debug(`Created redirect token ${redirectToken} for token ${token}`)
  return redirectToken
}

export const getAuthorizedTokenFromRedirect = async (redirectToken: string) => {
  const token = await getCache<string>(redirectToken)
  if (!token || typeof token !== 'string') {
    logger.debug(`Redirect token ${redirectToken} is invalid, since it gave the following invalid token: ${token}`)
    return null
  }

  logger.debug(`Redirect token ${redirectToken} is valid, and gave token ${token}`)
  return token
}

export const getRequestUserTokenData = async (req: Request) => {
  const token = getCookie(req, 'blue-eyed-token')
  if (!token) {
    logger.debug('No token found in request')
    return null
  }

  logger.debug(`Found token ${token} in request`)
  return await getUserTokenData(token)
}

const getUserTokenData = async (token: string) => {
  const res = await getCache<UserTokenData>(token)
  if (!res) {
    logger.debug(`Token ${token} is invalid, with the following invalid data: ${res}`)
    return null
  }

  const parseResult = await userTokenSchema.safeParseAsync(res)
  if (!parseResult.success) {
    logger.debug(`Token ${token} is invalid, with the following invalid data: ${res}`)
    return null
  }

  const { userId, createdAt } = res

  const user = await getUserById(userId)
  if (!user) {
    logger.debug(`Token ${token} is invalid, since user ${userId} does not exist`)
    return null
  }

  const lastPasswordReset = await getLastPasswordReset(userId)
  if (lastPasswordReset && lastPasswordReset > createdAt) {
    logger.debug(`Token ${token} is invalid, since user ${userId} has changed their password since the token was created`)
    return null
  }

  logger.debug(`Token ${token} is valid, and belongs to user ${userId}`)
  return parseResult.data
}
