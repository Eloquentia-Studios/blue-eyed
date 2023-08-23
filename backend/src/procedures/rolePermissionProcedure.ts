import type { Permission } from '@prisma/client'
import { z } from 'zod'
import permissionProcedure from './permissionProcedure'

const rolePermissionProcedure = (permissions: Permission[]) =>
  permissionProcedure(permissions)
    .input(
      z.object({
        targetedRoleId: z.string().uuid()
      })
    )
    .use(async ({ ctx, next }) => {
      // Do stuff

      return next({ ctx })
    })

export default rolePermissionProcedure
