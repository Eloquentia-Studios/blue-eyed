import type { Permission } from '@prisma/client'
import { z } from 'zod'
import throwAndLogTRPCError from '../../libs/throwAndLogTRPCError'
import rolePermissionProcedure from '../../procedures/rolePermissionProcedure'
import PrivilegeService from '../../services/privilege'
import RoleService from '../../services/role'

const changeRolePermissionRoute = rolePermissionProcedure(['ROLES_WRITE'])
  .input(
    z.object({
      permission: z
        .string()
        // @ts-ignore Zod doesn't want to accept Permission as a string here
        .refine((permission) => allPermissions().includes(permission))
        .transform((permission) => permission as Permission),
      enabled: z.boolean()
    })
  )
  .mutation(async ({ ctx, input: { targetedRoleId, permission, enabled } }) => {
    const userCanMoveRole = await PrivilegeService.canUserEditRolePermission(ctx.user.id, targetedRoleId, permission)
    if (!userCanMoveRole) return throwAndLogTRPCError('FORBIDDEN', 'forbidden', `User ${ctx.user.username} tried to change a role permission for a role which is above or the same as their highest role.`, 'warn')

    return await RoleService.changePermission(targetedRoleId, permission, enabled)
  })

export default changeRolePermissionRoute
