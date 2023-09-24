import { cacheTime } from '../constants/time'
import generateRandomString from '../libs/generateRandomString'
import { setCache } from './cache'
import logger from './logging'

export default class RedirectionService {
  public static async createToken(token: string) {
    const redirectToken = generateRandomString(32)

    await setCache(redirectToken, token, { ttl: cacheTime.second * 10 })

    logger.debug(`Created redirect token ${redirectToken} for token ${token}`)
    return redirectToken
  }
}