import type { Role } from '@prisma/client'
import { Permission } from '@prisma/client'
import logger from './logging'
import prisma from './prisma'
import RoleService from './role'
import { getUserPermissions } from './user'

export default class PermissionService {
  public static all() {
    return Object.values(Permission)
  }

  public static async userHasPermissions(userId: string, permissions: Permission[]) {
    const userPermissions = await getUserPermissions(userId)

    return permissions.every((permission) => userPermissions.includes(permission))
  }

  public static async highestRoleWithPermissionsForUser(userId: string, permissions: Permission[]) {
    const roles = await RoleService.getForUser(userId)

    const userRolesWithPermissions = roles.filter((role) => permissions.every((permission) => role.permissions.includes(permission)))

    return RoleService.getHighest(userRolesWithPermissions.map((role) => role.id))
  }

  public static async getForRoles(roles: Role[]) {
    const permissions = new Set<Permission>()

    roles.forEach((role) => {
      role.permissions.forEach((permission) => {
        permissions.add(permission)
      })
    })

    return Array.from(permissions)
  }

  public static async getForRole(roleId: string) {
    logger.debug(`Getting permissions for role ${roleId}`)

    const role = await prisma.role.findUnique({
      where: {
        id: roleId
      },
      select: {
        permissions: true
      }
    })

    return role ? role.permissions : null
  }
}
