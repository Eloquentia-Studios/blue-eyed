import permissionProcedure from '../../procedures/permissionProcedure'
import { getOrderedRoles } from '../../services/role'

const getAllRolesQuery = permissionProcedure(['ROLES_READ']).query(() => getOrderedRoles())

export default getAllRolesQuery
