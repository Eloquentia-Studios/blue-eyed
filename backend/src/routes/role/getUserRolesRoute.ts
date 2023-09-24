import { z } from 'zod'
import permissionProcedure from '../../procedures/permissionProcedure'
import RoleService from '../../services/role'

const getUserRolesRoute = permissionProcedure(['USERS_READ', 'ROLES_READ'])
  .input(
    z.object({
      userId: z.string().uuid()
    })
  )
  .query(({ input: { userId } }) => RoleService.getForUser(userId))

export default getUserRolesRoute
