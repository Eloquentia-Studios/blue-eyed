import type { Role } from '@prisma/client'
import { $Enums, Permission } from '@prisma/client'
import PermissionService from './permission'
import { getOrderedRoles, roleIsAboveOtherRole } from './role'

export default class PrivilegeService {
  public static async getUserEditableRolePermissions(userId: string, roles: Role[]) {
    const permissions = Object.values($Enums.Permission)
    const promises = roles.map(async (role) => {
      const promisePermissions = permissions.map(async (permission) => ({
        name: permission,
        enabled: role.permissions.includes(permission),
        editable: await PrivilegeService.canUserEditRolePermission(userId, role.id, permission)
      }))

      const perms = await Promise.all(promisePermissions)
      const permissionObject = perms.reduce((acc, perm) => {
        acc[perm.name] = { enabled: perm.enabled, editable: perm.editable }
        return acc
      }, {} as { [key in Permission]: { enabled: boolean; editable: boolean } })

      return {
        ...role,
        permissions: permissionObject
      }
    })

    return Promise.all(promises)
  }

  public static async canUserEditRolePermission(userId: string, roleId: string, permission: $Enums.Permission) {
    const highestRolesWrite = await PermissionService.highestRoleWithPermissionsForUser(userId, ['ROLES_WRITE'])
    if (!highestRolesWrite) return false

    const highestPermission = await PermissionService.highestRoleWithPermissionsForUser(userId, [permission])
    if (!highestPermission) return false

    if (!(await roleIsAboveOtherRole(highestRolesWrite.id, roleId))) return false
    if (!(await roleIsAboveOtherRole(highestPermission.id, roleId))) return false

    return true
  }

  public static async userHasHigherPrivilege(exertingPrivilage: string, privilageBeingTried: string, permissions: $Enums.Permission[]) {
    const exertingPrivilageRole = await PermissionService.highestRoleWithPermissionsForUser(exertingPrivilage, permissions)
    const isPrivilageRole = await PermissionService.highestRoleWithPermissionsForUser(privilageBeingTried, [])

    if (!exertingPrivilageRole || !isPrivilageRole) return false
    return await roleIsAboveOtherRole(exertingPrivilageRole.id, isPrivilageRole.id)
  }

  public static async canUserDeleteRole(userId: string, roleId: string) {
    const highestUserRole = await PermissionService.highestRoleWithPermissionsForUser(userId, ['ROLES_WRITE'])
    if (!highestUserRole) return false

    const orderedRoles = await getOrderedRoles()
    const highestRoleIndex = orderedRoles.findIndex((role) => role.id === highestUserRole.id)
    const targetedRoleIndex = orderedRoles.findIndex((role) => role.id === roleId)

    if (targetedRoleIndex === orderedRoles.length - 1) return false
    return targetedRoleIndex > highestRoleIndex
  }

  public static async getRoleMovableDirections(userId: string, roleId: string) {
    const highestUserRole = await PermissionService.highestRoleWithPermissionsForUser(userId, ['ROLES_WRITE'])
    if (!highestUserRole) return { up: false, down: false }

    const orderedRoles = await getOrderedRoles()
    const highestUserRoleIndex = orderedRoles.findIndex((role) => role.id === highestUserRole.id)
    const targetedRoleIndex = orderedRoles.findIndex((role) => role.id === roleId)

    return {
      up: PrivilegeService.canMoveRoleInDirection(-1, orderedRoles, targetedRoleIndex, highestUserRoleIndex),
      down: PrivilegeService.canMoveRoleInDirection(1, orderedRoles, targetedRoleIndex, highestUserRoleIndex)
    }
  }

  private static canMoveRoleInDirection(direction: 1 | -1, roles: Role[], targetedRoleIndex: number, highestUserRoleIndex: number) {
    const newIndex = targetedRoleIndex + direction

    if (targetedRoleIndex <= highestUserRoleIndex) return false
    if (targetedRoleIndex === roles.length - 1) return false

    if (newIndex <= 0) return false
    if (newIndex >= roles.length - 1) return false
    if (newIndex <= highestUserRoleIndex) return false

    return true
  }
}
