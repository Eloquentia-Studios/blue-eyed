import { z } from 'zod'
import throwAndLogTRPCError from '../../libs/throwAndLogTRPCError'
import permissionProcedure from '../../procedures/permissionProcedure'
import PermissionService from '../../services/permission'
import RoleService from '../../services/role'

const moveRoleBeforeRoute = permissionProcedure(['ROLES_WRITE'])
  .input(
    z.object({
      roleToMove: z.string().uuid(),
      roleToMoveBefore: z.string().uuid()
    })
  )
  .mutation(async ({ ctx, input: { roleToMoveBefore, roleToMove } }) => {
    const highestUserRole = await PermissionService.highestRoleWithPermissionsForUser(ctx.user.id, ['ROLES_WRITE'])
    if (!highestUserRole) return throwAndLogTRPCError('FORBIDDEN', 'forbidden', `User ${ctx.user.username} tried to move a role they don't have.`, 'warn')

    const orderedRoles = await RoleService.getOrderedRoles()
    const highestUserRoleIndex = orderedRoles.findIndex((role) => role.id === highestUserRole.id)
    const roleToMoveBeforeIndex = orderedRoles.findIndex((role) => role.id === roleToMoveBefore)
    const roleToMoveIndex = orderedRoles.findIndex((role) => role.id === roleToMove)

    if (highestUserRoleIndex >= roleToMoveBeforeIndex) return throwAndLogTRPCError('FORBIDDEN', 'forbidden', `User ${ctx.user.username} tried to move a role before a role they don't have.`, 'warn')
    if (highestUserRoleIndex >= roleToMoveIndex) return throwAndLogTRPCError('FORBIDDEN', 'forbidden', `User ${ctx.user.username} tried to move a role they don't have.`, 'warn')

    return RoleService.moveBeforeOther(roleToMove, roleToMoveBefore)
  })

export default moveRoleBeforeRoute
