import { z } from 'zod'
import permissionProcedure from '../../procedures/permissionProcedure'
import { setUserRoleStatus } from '../../services/role'

const setUserRoleStatusRoute = permissionProcedure(['ROLES_WRITE', 'USERS_WRITE'])
  .input(
    z.object({
      userId: z.string().uuid(),
      roleId: z.string().uuid(),
      enabled: z.boolean()
    })
  )
  .mutation(async ({ ctx, input: { userId, roleId, enabled } }) => setUserRoleStatus(userId, roleId, enabled))

export default setUserRoleStatusRoute
