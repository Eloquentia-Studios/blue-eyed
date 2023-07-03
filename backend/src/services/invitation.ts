import { cacheTime } from '../constants/time'
import generateRandomString from '../libs/generateRandomString'
import { deleteCache, getCache, setCache } from './cache'

export const generateInvitationToken = async () => {
  const token = generateRandomString(16)
  await setCache(token, true, { ttl: cacheTime.day })
  return token
}

export const validateInvitationToken = async (token: string) => {
  const result = await getCache<boolean>(token)
  return !!result
}

export const invalidateInvitationToken = async (token: string) => deleteCache(token)
