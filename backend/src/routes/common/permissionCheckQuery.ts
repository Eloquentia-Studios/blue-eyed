import type { Permission } from '@prisma/client'
import authenticatedProcedure from '../../procedures/authenticatedProcedure'
import { userHasPermissions } from '../../services/permission'

export const permissionCheckQuery = (permission: Permission) =>
  authenticatedProcedure.query(async ({ ctx }) => {
    const hasPermission = await userHasPermissions(ctx.user.id, [permission])

    if (!hasPermission) return false

    return true
  })
