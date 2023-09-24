import { cacheTime } from '../constants/time'
import generateRandomString from '../libs/generateRandomString'
import Cache from './cache'
import logger from './logging'

export default class InvitationService {
  public static async generateToken() {
    const token = generateRandomString(16)
    await Cache.set(token, true, { ttl: cacheTime.day })

    logger.debug(`Created invitation token ${token}`)
    return token
  }

  public static async validateToken(token: string) {
    logger.debug(`Validating invitation token ${token}`)
    const result = await Cache.get<boolean>(token)

    if (!result) {
      logger.debug(`Invitation token ${token} is invalid, with result: ${result}`)
      return false
    }

    logger.debug(`Invitation token ${token} is valid`)
    return true
  }

  public static async invalidateToken(token: string) {
    logger.debug(`Invalidating invitation token ${token}`)
    return await Cache.delete(token)
  }
}
