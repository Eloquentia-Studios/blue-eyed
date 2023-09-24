import type { Role } from '@prisma/client'
import { $Enums, Permission } from '@prisma/client'
import { getHighestUserRoleWithPermissions } from './permission'
import { getOrderedRoles, roleIsAboveOtherRole } from './role'

class Privilege {
  public static async getUserEditableRoles(userId: string, roles: Role[]) {
    const permissions = Object.values($Enums.Permission)
    const promises = roles.map(async (role) => {
      const promisePermissions = permissions.map(async (permission) => ({
        name: permission,
        enabled: role.permissions.includes(permission),
        editable: await Privilege.canUserEditRolePermission(userId, role.id, permission)
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

  public static async canUserEditRolePermission(userId: string, roleId: string, permission: $Enums.Permission): Promise<boolean> {
    const highestRolesWrite = await getHighestUserRoleWithPermissions(userId, ['ROLES_WRITE'])
    if (!highestRolesWrite) return false

    const highestPermission = await getHighestUserRoleWithPermissions(userId, [permission])
    if (!highestPermission) return false

    return (await roleIsAboveOtherRole(highestRolesWrite.id, roleId)) && (await roleIsAboveOtherRole(highestPermission.id, roleId))
  }

  public static async userHasHigherPrivilege(exertingPrivilage: string, privilageBeingTried: string, permissions: $Enums.Permission[]) {
    const exertingPrivilageRole = await getHighestUserRoleWithPermissions(exertingPrivilage, permissions)
    const isPrivilageRole = await getHighestUserRoleWithPermissions(privilageBeingTried, [])

    if (!exertingPrivilageRole || !isPrivilageRole) return false
    return await roleIsAboveOtherRole(exertingPrivilageRole.id, isPrivilageRole.id)
  }

  public static async canUserDeleteRole(userId: string, roleId: string): Promise<boolean> {
    const highestUserRole = await getHighestUserRoleWithPermissions(userId, ['ROLES_WRITE'])
    if (!highestUserRole) return false

    const orderedRoles = await getOrderedRoles()
    const highestRoleIndex = orderedRoles.findIndex((role) => role.id === highestUserRole.id)
    const targetedRoleIndex = orderedRoles.findIndex((role) => role.id === roleId)

    if (targetedRoleIndex === orderedRoles.length - 1) return false
    return targetedRoleIndex > highestRoleIndex
  }

  public static async getRoleMovableDirections(userId: string, roleId: string): Promise<{ up: boolean; down: boolean }> {
    const highestUserRole = await getHighestUserRoleWithPermissions(userId, ['ROLES_WRITE'])
    if (!highestUserRole) return { up: false, down: false }

    const orderedRoles = await getOrderedRoles()
    const highestUserRoleIndex = orderedRoles.findIndex((role) => role.id === highestUserRole.id)
    const targetedRoleIndex = orderedRoles.findIndex((role) => role.id === roleId)

    return {
      up: Privilege.canMoveRoleInDirection(-1, orderedRoles, targetedRoleIndex, highestUserRoleIndex),
      down: Privilege.canMoveRoleInDirection(1, orderedRoles, targetedRoleIndex, highestUserRoleIndex)
    }
  }

  private static canMoveRoleInDirection(direction: 1 | -1, roles: Role[], targetedRoleIndex: number, highestUserRoleIndex: number): boolean {
    const newIndex = targetedRoleIndex + direction

    if (targetedRoleIndex <= highestUserRoleIndex) return false
    if (targetedRoleIndex === roles.length - 1) return false

    if (newIndex <= 0) return false
    if (newIndex >= roles.length - 1) return false
    if (newIndex <= highestUserRoleIndex) return false

    return true
  }
}

export default Privilege
