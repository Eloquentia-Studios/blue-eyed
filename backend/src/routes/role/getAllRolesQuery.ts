import permissionProcedure from '../../procedures/permissionProcedure'
import PrivilegeService from '../../services/privilege'
import { getOrderedRoles } from '../../services/role'

const getAllRolesQuery = permissionProcedure(['ROLES_READ']).query(async ({ ctx: { user } }) => {
  const roles = await getOrderedRoles()
  return PrivilegeService.getUserEditableRolePermissions(user.id, roles)
})

export default getAllRolesQuery
