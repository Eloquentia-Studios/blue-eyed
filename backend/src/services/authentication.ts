import type { Request } from 'express'
import { z } from 'zod'
import { sessionTime } from '../constants/time'
import generateRandomString from '../libs/generateRandomString'
import getCookie from '../libs/getCookie'
import Cache from './cache'
import logger from './logging'
import UserService from './user'

const userTokenSchema = z.object({
  userId: z.string().uuid(),
  createdAt: z.number().positive().int()
})

type UserTokenData = z.infer<typeof userTokenSchema>

export default class AuthenticationService {
  public static async createToken(userId: string) {
    const token = generateRandomString()
    const createdAt = Date.now()

    // Want to make sure that tokens look the way we expect them too, or they could create issues
    const validatedData = await userTokenSchema.parseAsync({ userId, createdAt })

    await Cache.set(token, validatedData, { ttl: sessionTime.cache })

    logger.debug(`Created authorized token for user ${userId} with token ${token}`)
    return token
  }

  public static async validateToken(token: string) {
    logger.debug(`Validating token ${token}`)
    const tokenData = await this.getDataFromToken(token)

    if (!tokenData) {
      logger.debug(`Token ${token} is invalid`)
      return false
    }

    logger.debug(`Token ${token} is valid`)
    return true
  }

  public static async getUserTokenDataFromRequest(req: Request) {
    const token = getCookie(req, 'blue-eyed-token')
    if (!token) {
      logger.debug('No token found in request')
      return null
    }

    logger.debug(`Found token ${token} in request`)
    return await this.getDataFromToken(token)
  }

  public static async getTokenFromRedirect(redirectToken: string) {
    const token = await Cache.get<string>(redirectToken)
    if (!token || typeof token !== 'string') {
      logger.debug(`Redirect token ${redirectToken} is invalid, since it gave the following invalid token: ${token}`)
      return null
    }

    logger.debug(`Redirect token ${redirectToken} is valid, and gave token ${token}`)
    return token
  }

  private static async getDataFromToken(token: string) {
    const tokenData = await Cache.get<UserTokenData>(token)
    if (!tokenData) {
      logger.debug(`Token ${token} is invalid, with the following invalid data: ${tokenData}`)
      return null
    }

    const parseResult = await userTokenSchema.safeParseAsync(tokenData)
    if (!parseResult.success) {
      logger.debug(`Token ${token} is invalid, with the following invalid data: ${tokenData}`)
      return null
    }

    const { userId, createdAt } = tokenData

    const user = await UserService.getById(userId)
    if (!user) {
      logger.debug(`Token ${token} is invalid, since user ${userId} does not exist`)
      return null
    }

    const lastPasswordReset = await UserService.getLastPasswordReset(userId)
    if (lastPasswordReset && lastPasswordReset > createdAt) {
      logger.debug(`Token ${token} is invalid, since user ${userId} has changed their password since the token was created`)
      return null
    }

    logger.debug(`Token ${token} is valid, and belongs to user ${userId}`)
    return parseResult.data
  }
}
