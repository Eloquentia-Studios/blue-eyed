import permissionProcedure from '../../procedures/permissionProcedure'
import PermissionService from '../../services/permission'

const getAllPermissionsQuery = permissionProcedure(['ROLES_READ']).query(() => PermissionService.all())

export default getAllPermissionsQuery
