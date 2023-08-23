import type { Permission } from '@prisma/client'
import { z } from 'zod'
import throwAndLogTRPCError from '../libs/throwAndLogTRPCError'
import { getHighestUserRoleWithPermissions } from '../services/permission'
import { roleIsAboveOtherRole } from '../services/role'
import permissionProcedure from './permissionProcedure'

const rolePermissionProcedure = (permissions: Permission[]) =>
  permissionProcedure(permissions)
    .input(
      z.object({
        targetedRoleId: z.string().uuid()
      })
    )
    .use(async ({ ctx, input: { targetedRoleId }, next }) => {
      const highestUserRole = await getHighestUserRoleWithPermissions(ctx.user.id, permissions)

      // @ts-ignore - Since the user has the permission, this will always be a string
      const userRoleIsHigher = await roleIsAboveOtherRole(highestUserRole.id, targetedRoleId)
      if (!userRoleIsHigher) return throwAndLogTRPCError('FORBIDDEN', 'forbidden', `User ${ctx.user.username} tried to affect a role which is above or the same as their highest role.`, 'warn')

      return next({ ctx })
    })

export default rolePermissionProcedure
