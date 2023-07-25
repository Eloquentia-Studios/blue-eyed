import type { Role } from '@prisma/client'
import { Permission } from '@prisma/client'
import logger from './logging'
import { getUserRoles } from './role'

export const allPermissions = () => Object.values(Permission)

export const userHasPermissions = async (userId: string, permissions: Permission[]) => {
  const userPermissions = await getUserPermissions(userId)

  return permissions.every((permission) => userPermissions.includes(permission))
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
