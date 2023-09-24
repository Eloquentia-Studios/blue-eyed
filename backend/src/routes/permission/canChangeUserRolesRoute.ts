import { z } from 'zod'
import authenticatedProcedure from '../../procedures/authenticatedProcedure'
import { getHighestUserRoleWithPermissions } from '../../services/permission'
import { roleIsAboveOtherRole } from '../../services/role'

const canChangeUserRolesRoute = authenticatedProcedure
  .input(
    z.object({
      targetRoleId: z.string().uuid()
    })
  )
  .query(async ({ ctx: { user }, input: { targetRoleId } }) => {
    const highestUserRole = await getHighestUserRoleWithPermissions(user.id, ['ROLES_WRITE', 'USERS_WRITE'])
    if (!highestUserRole) return false

    return roleIsAboveOtherRole(highestUserRole.id, targetRoleId)
  })

export default canChangeUserRolesRoute
