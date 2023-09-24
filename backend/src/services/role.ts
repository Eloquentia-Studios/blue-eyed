import type { Permission, PrismaClient, Role } from '@prisma/client'
import logger from './logging'
import PermissionService from './permission'
import type { PrismaTransactionClient } from './prisma'
import prisma from './prisma'
import UserService from './user'

export default class RoleService {
  public static async create(name: string, previous?: string, permissions: Permission[] = [], lockedPosition?: boolean) {
    if (permissions.length === 0) {
      logger.verbose(`Creating role ${name} with no permissions`)
    } else {
      logger.verbose(`Creating role ${name} with permissions ${permissions.join(', ')}`)
    }

    const role = await prisma.role.create({
      data: {
        name,
        lockedPosition,
        permissions: {
          set: permissions
        },
        previous: {
          connect: previous ? { id: previous } : undefined
        }
      }
    })

    return role
  }

  public static async moveBeforeOther(roleId: string, nextId: string) {
    prisma.$transaction(async (tx) => {
      logger.debug(`Moving role ${roleId} before ${nextId}`)

      const role = await this.getById(roleId)
      if (!role) {
        logger.debug(`Could not find role with id ${roleId}`)
        throw new Error('Role not found')
      }

      if (role.lockedPosition) {
        logger.debug(`Role ${roleId} is locked`)
        throw new Error('Role is locked')
      }

      if (role.previous && role.next) await this.connect(tx, role.previous, role.next)
      await this.disconnect(tx, role)

      const nextRole = await this.getById(nextId)
      if (!nextRole) {
        logger.debug(`Could not find role with id ${nextId}`)
        throw new Error('Role not found')
      }

      await this.connect(tx, role, nextRole)
      if (nextRole.previous) await this.connect(tx, nextRole.previous, role)

      logger.debug(`Moved role ${roleId} before ${nextId}`)
    })
  }

  public static async getById(id: string) {
    logger.debug(`Getting role with id ${id}`)
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        previous: true,
        next: true
      }
    })

    if (!role) {
      logger.debug(`Could not find role with id ${id}`)
      return null
    }

    logger.debug(`Role with id ${id} was ${role.name}`)
    return role
  }

  public static async getByName(name: string) {
    logger.debug(`Getting role with name ${name}`)
    const role = await prisma.role.findUnique({
      where: { name }
    })

    if (!role) {
      logger.debug(`Could not find role with name ${name}`)
      return null
    }

    logger.debug(`Found role with name ${name} and id ${role.id}`)
    return role
  }

  public static async createDefault() {
    logger.info('Creating default roles')

    const superAdminRole = await this.create('SuperAdmin', undefined, PermissionService.all())
    logger.info('Created SuperAdmin role')

    await this.create('User', superAdminRole.id)
    logger.info('Created User role')

    logger.info('Default roles created')
  }

  public static async getForUser(userId: string) {
    logger.debug(`Getting roles for user ${userId}`)
    const roles = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        roles: true
      }
    })

    if (!roles) {
      logger.debug(`Could not find roles for user ${userId}`)
      return []
    }

    logger.debug(`Found roles for user ${userId}`)

    return roles ? roles.roles : []
  }

  public static async setForUser(userId: string, roleId: string, enabled: boolean) {
    logger.debug(`Setting role ${roleId} for user ${userId} to ${enabled}`)

    const role = await this.getById(roleId)
    if (!role) {
      logger.debug(`Could not find role with id ${roleId}`)
      throw new Error('Role not found')
    }

    if (role.name === 'User') {
      logger.debug('Cannot change status of User role')
      throw new Error('Cannot change status of User role')
    }

    if (role.name === 'SuperAdmin' && !enabled) {
      const usersWithRole = await UserService.getByRole(roleId)
      if (usersWithRole.length <= 1) {
        logger.debug('Cannot remove last SuperAdmin')
        throw new Error('Cannot remove last SuperAdmin')
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        roles: {
          connect: enabled ? [{ id: roleId }] : [],
          disconnect: !enabled ? [{ id: roleId }] : []
        }
      }
    })

    logger.debug(`Set role ${roleId} for user ${userId} to ${enabled}`)
  }

  public static async getOrderedRoles() {
    logger.debug('Getting ordered roles')

    const roles = await prisma.$queryRaw<Role[]>`
      WITH RECURSIVE roles AS (
        SELECT *, 1 AS level 
        FROM "Role"
        WHERE name = 'User' 
        UNION ALL
        SELECT r.*, level + 1
        FROM "Role" r
        INNER JOIN roles ON roles."previousId" = r.id
      )
      SELECT *
      FROM roles
      ORDER BY level DESC 
    `

    logger.debug(`Found ${roles.length} roles.`)

    return roles
  }

  public static async changePermission(roleId: string, permission: Permission, enabled: boolean) {
    logger.debug(`Changing permission ${permission} for role ${roleId} to ${enabled}`)

    const rolePermissions = await PermissionService.getForRole(roleId)
    if (!rolePermissions) return

    const rest = rolePermissions.filter((rolePermission) => rolePermission !== permission)

    await prisma.role.update({
      where: {
        id: roleId
      },
      data: {
        permissions: {
          set: enabled ? [permission, ...rest] : rest
        }
      }
    })
  }

  public static async getAll() {
    logger.debug('Getting all roles')
    const roles = await prisma.role.findMany({
      orderBy: {
        name: 'asc'
      }
    })

    logger.debug(`Found ${roles.length} roles`)
    return roles
  }

  public static async delete(roleId: string) {
    logger.debug(`Deleting role ${roleId}`)

    const role = await this.getById(roleId)
    if (!role) {
      logger.debug(`Could not find role with id ${roleId}`)
      throw new Error('Role not found')
    }

    if (role.name === 'User') {
      logger.debug('Cannot delete User role')
      throw new Error('Cannot delete User role')
    }

    if (role.name === 'SuperAdmin') {
      logger.debug('Cannot delete SuperAdmin role')
      throw new Error('Cannot delete SuperAdmin role')
    }

    prisma.$transaction(async (tx) => {
      if (role.previous && role.next) await this.connect(tx, role.previous, role.next)
      await this.disconnect(tx, role)

      await tx.role.delete({
        where: { id: roleId }
      })
    })

    logger.debug(`Deleted role ${roleId}`)
  }

  public static async isAboveOther(highRoleId: string, lowRoleId: string) {
    const roles = await this.getOrderedRoles()

    const highRoleIndex = roles.findIndex((role) => role.id === highRoleId)
    const lowRoleIndex = roles.findIndex((role) => role.id === lowRoleId)

    return highRoleIndex < lowRoleIndex
  }

  public static async getHighest(roleIds: string[]) {
    const roles = await this.getOrderedRoles()
    return roles.find((role) => roleIds.includes(role.id))
  }

  private static async connect(tx: PrismaTransactionClient | PrismaClient, a: Role, b: Role) {
    tx.role.update({
      where: { id: a.id },
      data: {
        next: {
          connect: { id: b.id }
        }
      }
    })
  }

  private static async disconnect(tx: PrismaTransactionClient | PrismaClient, role: Role) {
    tx.role.update({
      where: { id: role.id },
      data: {
        next: {
          disconnect: true
        },
        previous: {
          disconnect: true
        }
      }
    })
  }
}
