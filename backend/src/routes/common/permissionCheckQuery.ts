import type { Permission } from '@prisma/client'
import authenticatedProcedure from '../../procedures/authenticatedProcedure'
import { userHasPermissions } from '../../services/permission'

export const permissionCheckQuery = (permissions: Permission | Permission[]) =>
  authenticatedProcedure.query(async ({ ctx }) => {
    const permissionArray = Array.isArray(permissions) ? permissions : [permissions]
    const hasPermission = await userHasPermissions(ctx.user.id, permissionArray)

    if (!hasPermission) return false

    return true
  })
