import { z } from 'zod'
import permissionProcedure from '../../procedures/permissionProcedure'
import { allPermissions, changeRolePermission } from '../../services/permission'

const changeRolePermissionRoute = permissionProcedure(['ROLES_WRITE'])
  .input(
    z.object({
      roleId: z.string().uuid(),
      // @ts-ignore This is fine, it does what you expect it to do
      permission: z.enum(allPermissions()),
      enabled: z.boolean()
    })
  )
  .mutation(async ({ input: { roleId, permission, enabled } }) => {
    // @ts-expect-error This is fine, it does what you expect it to do
    await changeRolePermission(roleId, permission, enabled)
  })

export default changeRolePermissionRoute
