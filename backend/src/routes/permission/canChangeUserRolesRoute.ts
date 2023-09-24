import { z } from 'zod'
import authenticatedProcedure from '../../procedures/authenticatedProcedure'
import PermissionService from '../../services/permission'
import RoleService from '../../services/role'

const canChangeUserRolesRoute = authenticatedProcedure
  .input(
    z.object({
      targetRoleId: z.string().uuid()
    })
  )
  .query(async ({ ctx: { user }, input: { targetRoleId } }) => {
    const highestUserRole = await PermissionService.highestRoleWithPermissionsForUser(user.id, ['ROLES_WRITE', 'USERS_WRITE'])
    if (!highestUserRole) return false

    return RoleService.isAboveOther(highestUserRole.id, targetRoleId)
  })

export default canChangeUserRolesRoute
