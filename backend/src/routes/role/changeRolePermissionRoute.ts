import { Permission } from '@prisma/client'
import { z } from 'zod'
import permissionProcedure from '../../procedures/permissionProcedure'
import { allPermissions, changeRolePermission } from '../../services/permission'

const changeRolePermissionRoute = permissionProcedure(['ROLES_WRITE'])
  .input(
    z.object({
      roleId: z.string().uuid(),
      permission: z
        .string()
        // @ts-ignore Zod doesn't want to accept Permission as a string here
        .refine((permission) => allPermissions().includes(permission))
        .transform((permission) => permission as Permission),
      enabled: z.boolean()
    })
  )
  .mutation(async ({ input: { roleId, permission, enabled } }) => await changeRolePermission(roleId, permission, enabled))

export default changeRolePermissionRoute
