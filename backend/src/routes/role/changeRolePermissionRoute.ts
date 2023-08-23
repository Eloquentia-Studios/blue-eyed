import type { Permission } from '@prisma/client'
import { z } from 'zod'
import rolePermissionProcedure from '../../procedures/rolePermissionProcedure'
import { allPermissions, changeRolePermission } from '../../services/permission'

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
  .mutation(async ({ input: { targetedRoleId, permission, enabled } }) => await changeRolePermission(targetedRoleId, permission, enabled))

export default changeRolePermissionRoute
