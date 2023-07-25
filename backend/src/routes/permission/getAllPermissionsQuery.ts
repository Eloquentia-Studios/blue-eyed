import permissionProcedure from '../../procedures/permissionProcedure'
import { allPermissions } from '../../services/permission'

const getAllPermissionsQuery = permissionProcedure(['ROLES_READ']).query(() => allPermissions())

export default getAllPermissionsQuery
