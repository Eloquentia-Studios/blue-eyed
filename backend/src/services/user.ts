import argon2 from 'argon2'
import type { Request } from 'express'
import { cacheTime } from '../constants/time'
import generateRandomString from '../libs/generateRandomString'
import { UserRegistrationInput, UserRegistrationSchema } from '../schemas/User'
import AuthenticationService from './authentication'
import Cache from './cache'
import logger from './logging'
import PermissionService from './permission'
import prisma from './prisma'
import RoleService from './role'

export default class UserService {
  public static async verifyPassword(id: string, password: string) {
    logger.debug(`Verifying user ${id}`)
    const user = await this.getById(id)
    if (!user) {
      logger.debug(`Could not verify user ${id} as they do not exist.`)
      return false
    }

    const result = await this.validatePassword(user.password, password)
    if (!result) {
      logger.debug(`Could not verify user ${id} as their password is incorrect.`)
      return false
    }

    logger.debug(`Successfully verified user ${id}`)
    return true
  }

  public static async create(info: UserRegistrationInput, roleIds: string[] = []) {
    if (!UserRegistrationSchema.safeParse(info).success) {
      logger.error('Invalid user information was passed to createUser.')
      throw new Error('Invalid user registration information.')
    }

    logger.debug(`Creating user with username ${info.username} and email ${info.email}`)
    return await prisma.user.create({
      data: {
        ...info,
        username: info.username.toLowerCase(),
        displayName: info.username,
        password: await this.hashPassword(info.password),
        roles: {
          connect: [...roleIds.map((role) => ({ id: role })), { name: 'User' }]
        }
      }
    })
  }

  public static async getByUsername(username: string) {
    logger.debug(`Getting user for ${username}`)
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() }
    })

    if (!user) {
      logger.debug(`Could not find use by username: ${username}`)
      return null
    }

    logger.debug(`Found ${user.id} for ${username}`)
    return user
  }

  public static async getById(id: string) {
    logger.debug(`Getting user with id ${id}`)
    const user = await prisma.user.findUnique({
      where: { id }
    })

    if (!user) {
      logger.debug(`Could not find user with id ${id}`)
      return null
    }

    logger.debug(`User with id ${id} was ${user.username}`)
    return user
  }

  public static async getAll() {
    logger.debug('Getting all users')
    const users = await prisma.user.findMany({
      select: {
        id: true,
        displayName: true,
        email: true
      },
      orderBy: {
        displayName: 'desc'
      }
    })

    logger.debug(`Found ${users.length} users`)
    return users
  }

  public static async delete(id: string) {
    logger.debug(`Deleting user with id ${id}`)
    return await prisma.user.delete({
      where: { id }
    })
  }

  public static async setPassword(userId: string, password: string) {
    logger.debug(`Setting password for user ${userId}`)
    const hash = await this.hashPassword(password)

    await prisma.user.update({
      where: { id: userId },
      data: { password: hash }
    })

    await this.setLastPasswordReset(userId, Date.now())
    logger.debug(`Successfully set password for user ${userId}`)
  }

  public static async setLastPasswordReset(userId: string, timestamp: number) {
    logger.debug(`Setting last password reset for user ${userId}`)
    await Cache.set(`${userId}:last-password-reset`, timestamp)
    logger.debug(`Successfully set last password reset for user ${userId}`)
  }

  public static async getLastPasswordReset(userId: string) {
    logger.debug(`Getting last password reset for user ${userId}`)
    const reset = await Cache.get<number>(`${userId}:last-password-reset`)
    if (!reset) {
      logger.debug(`Could not find a previous password reset for user ${userId}`)
      return null
    }

    logger.debug(`Found last password reset for user ${userId} at ${reset}`)
    return reset
  }

  public static async generateResetToken(id: string) {
    logger.debug(`Generating reset token for user ${id}`)
    const token = await generateRandomString(128)
    await Cache.set(token, id, { ttl: cacheTime.hour * 6 })

    logger.debug(`Generated reset token ${token} for user ${id}`)
    return token
  }

  public static async getIdFromResetToken(token: string) {
    logger.debug(`Getting user id for reset token ${token}`)
    const userId = await Cache.get<string>(token)
    logger.debug(`Found user id ${userId} for reset token ${token}`)
    return userId
  }

  public static async getFromRequest(req: Request) {
    logger.debug('Getting a user from a request')
    const tokenData = await AuthenticationService.getUserTokenDataFromRequest(req)
    if (!tokenData) {
      logger.debug('Could not get user from request as no token data was found')
      return null
    }

    let user = await this.getById(tokenData.userId)
    if (!user) {
      logger.debug(`Could not get user from request as no user was found with id ${tokenData.userId}`)
      return null
    }

    logger.debug(`Successfully got user ${user.username} from request`)
    return { ...user, password: undefined }
  }

  public static async invalidateResetToken(token: string) {
    logger.debug(`Invalidating reset token ${token}`)
    return await Cache.delete(token)
  }

  public static async getPermissions(userId: string) {
    logger.debug(`Getting permissions for user ${userId}`)

    const roles = await RoleService.getForUser(userId)
    return PermissionService.getFromRoles(roles)
  }

  public static async getByRole(roleId: string) {
    logger.debug(`Getting users with role ${roleId}`)

    const users = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            id: roleId
          }
        }
      }
    })

    logger.debug(`Found ${users.length} users with role ${roleId}`)
    return users
  }

  private static async hashPassword(password: string) {
    logger.debug('Hashing password')
    return await argon2.hash(password)
  }

  private static async validatePassword(hash: string, password: string) {
    logger.debug('Verifying password')
    return await argon2.verify(hash, password)
  }
}
