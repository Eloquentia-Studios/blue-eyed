import { z } from 'zod'
import permissionProcedure from '../../procedures/permissionProcedure'
import { getUserRoles } from '../../services/role'

const getUserRolesRoute = permissionProcedure(['USERS_READ', 'ROLES_READ'])
  .input(
    z.object({
      userId: z.string().uuid()
    })
  )
  .query(({ input: { userId } }) => getUserRoles(userId))

export default getUserRolesRoute
