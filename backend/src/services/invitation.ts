import { cacheTime } from '../constants/time'
import generateRandomString from '../libs/generateRandomString'
import { deleteCache, getCache, setCache } from './cache'
import logger from './logging'

export const generateInvitationToken = async () => {
  const token = generateRandomString(16)
  await setCache(token, true, { ttl: cacheTime.day })

  logger.debug(`Created invitation token ${token}`)
  return token
}

export const validateInvitationToken = async (token: string) => {
  logger.debug(`Validating invitation token ${token}`)
  const result = await getCache<boolean>(token)

  if (!result) {
    logger.debug(`Invitation token ${token} is invalid, with result: ${result}`)
    return false
  }

  logger.debug(`Invitation token ${token} is valid`)
  return true
}

export const invalidateInvitationToken = async (token: string) => {
  logger.debug(`Invalidating invitation token ${token}`)
  return await deleteCache(token)
}
