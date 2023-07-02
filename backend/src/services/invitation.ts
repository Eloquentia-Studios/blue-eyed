import generateRandomString from '../libs/generateRandomString'
import { deleteCache, getCache, setCache } from './cache'

export const generateInvitationToken = async () => {
  const token = generateRandomString(16)
  const ttl = 60 * 60 * 24 // 24 hours
  await setCache(token, true, { ttl })
  return token
}

export const validateInvitationToken = async (token: string) => {
  const result = await getCache<boolean>(token)
  return !!result
}

export const invalidateInvitationToken = async (token: string) => deleteCache(token)
