import permissionProcedure from '../../procedures/permissionProcedure'
import Privilege from '../../services/privilege'
import { getOrderedRoles } from '../../services/role'

const getAllRolesQuery = permissionProcedure(['ROLES_READ']).query(async ({ ctx: { user } }) => {
  const roles = await getOrderedRoles()
  return Privilege.getUserEditableRoles(user.id, roles)
})

export default getAllRolesQuery
