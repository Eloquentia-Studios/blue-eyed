import type { Role } from '@prisma/client'
import { getHighestUserRoleWithPermissions } from './permission'
import { getOrderedRoles } from './role'

class Privilege {
  public static async canUserDeleteRole(userId: string, roleId: string): Promise<boolean> {
    const highestUserRole = await getHighestUserRoleWithPermissions(userId, ['ROLES_WRITE'])
    if (!highestUserRole) return false

    const orderedRoles = await getOrderedRoles()
    const highestRoleIndex = orderedRoles.findIndex((role) => role.id === highestUserRole.id)
    const targetedRoleIndex = orderedRoles.findIndex((role) => role.id === roleId)

    if (targetedRoleIndex === orderedRoles.length - 1) return false
    return targetedRoleIndex > highestRoleIndex
  }

  public static async canUserMoveRole(userId: string, roleId: string): Promise<{ up: boolean; down: boolean }> {
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
