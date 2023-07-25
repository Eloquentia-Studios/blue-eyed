import type { Role } from '@prisma/client'
import { Permission } from '@prisma/client'
import logger from './logging'
import prisma from './prisma'
import { getUserRoles } from './role'

export const allPermissions = () => Object.values(Permission)

export const userHasPermissions = async (userId: string, permissions: Permission[]) => {
  const userPermissions = await getUserPermissions(userId)

  return permissions.every((permission) => userPermissions.includes(permission))
}

export const changeRolePermission = async (roleId: string, permission: Permission, enabled: boolean) => {
  logger.debug(`Changing permission ${permission} for role ${roleId} to ${enabled}`)

  const rolePermissions = await getRolePermissions(roleId)
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

const getUserPermissions = async (userId: string) => {
  // This could be in the user service, but it's here for now

  logger.debug(`Getting permissions for user ${userId}`)

  const roles = await getUserRoles(userId)

  return getPermissionsFromRoles(roles)
}

const getPermissionsFromRoles = (roles: Role[]) => {
  const permissions = new Set<Permission>()

  roles.forEach((role) => {
    role.permissions.forEach((permission) => {
      permissions.add(permission)
    })
  })

  return Array.from(permissions)
}

const getRolePermissions = async (roleId: string) => {
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
