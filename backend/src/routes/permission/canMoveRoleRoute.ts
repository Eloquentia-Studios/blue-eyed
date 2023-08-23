import type { Role } from '@prisma/client'
import { z } from 'zod'
import authenticatedProcedure from '../../procedures/authenticatedProcedure'
import { getHighestUserRoleWithPermissions } from '../../services/permission'
import { getOrderedRoles } from '../../services/role'

const canMoveRoleRoute = authenticatedProcedure.input(z.object({ roleId: z.string().uuid() })).query(async ({ ctx, input: { roleId } }) => {
  const highestUserRole = await getHighestUserRoleWithPermissions(ctx.user.id, ['ROLES_WRITE'])
  if (!highestUserRole) return { up: false, down: false }

  const orderedRoles = await getOrderedRoles()
  const highestUserRoleIndex = orderedRoles.findIndex((role) => role.id === highestUserRole.id)
  const targetedRoleIndex = orderedRoles.findIndex((role) => role.id === roleId)

  return {
    up: canMoveDirection(Direction.up, orderedRoles, targetedRoleIndex, highestUserRoleIndex),
    down: canMoveDirection(Direction.down, orderedRoles, targetedRoleIndex, highestUserRoleIndex)
  }
})

enum Direction {
  up = -1,
  down = 1
}
const canMoveDirection = (direction: Direction, roles: Role[], targetedRoleIndex: number, highestUserRoleIndex: number): boolean => {
  const newIndex = targetedRoleIndex + direction

  if (targetedRoleIndex <= highestUserRoleIndex) return false
  if (targetedRoleIndex === roles.length - 1) return false

  if (newIndex <= 0) return false
  if (newIndex >= roles.length - 1) return false
  if (newIndex <= highestUserRoleIndex) return false

  return true
}

export default canMoveRoleRoute
