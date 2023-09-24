import { z } from 'zod'
import rolePermissionProcedure from '../../procedures/rolePermissionProcedure'
import RoleService from '../../services/role'

const setUserRoleStatusRoute = rolePermissionProcedure(['ROLES_WRITE', 'USERS_WRITE'])
  .input(
    z.object({
      userId: z.string().uuid(),
      enabled: z.boolean()
    })
  )
  .mutation(async ({ ctx, input: { userId, targetedRoleId, enabled } }) => RoleService.setForUser(userId, targetedRoleId, enabled))

export default setUserRoleStatusRoute
