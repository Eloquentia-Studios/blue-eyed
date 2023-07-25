import permissionProcedure from '../../procedures/permissionProcedure'
import { getAllRoles } from '../../services/role'

const getAllRolesQuery = permissionProcedure(['ROLES_READ']).query(() => getAllRoles())

export default getAllRolesQuery
