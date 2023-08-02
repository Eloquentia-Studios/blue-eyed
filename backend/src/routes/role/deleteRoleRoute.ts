import { z } from 'zod'
import permissionProcedure from '../../procedures/permissionProcedure'
import { deleteRole } from '../../services/role'

const deleteRoleRoute = permissionProcedure(['ROLES_WRITE'])
  .input(
    z.object({
      id: z.string().uuid()
    })
  )
  .mutation(async ({ ctx, input: { id } }) => deleteRole(id))

export default deleteRoleRoute
