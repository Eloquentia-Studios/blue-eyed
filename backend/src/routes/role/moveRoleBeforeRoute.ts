import { z } from 'zod'
import permissionProcedure from '../../procedures/permissionProcedure'
import { moveRoleBefore } from '../../services/role'

const moveRoleBeforeRoute = permissionProcedure(['ROLES_WRITE'])
  .input(
    z.object({
      roleToMove: z.string().uuid(),
      roleIdToMoveBefore: z.string().uuid()
    })
  )
  .mutation(({ input: { roleIdToMoveBefore, roleToMove } }) => moveRoleBefore(roleToMove, roleIdToMoveBefore))

export default moveRoleBeforeRoute
