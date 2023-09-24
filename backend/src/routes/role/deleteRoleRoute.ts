import rolePermissionProcedure from '../../procedures/rolePermissionProcedure'
import RoleService from '../../services/role'

const deleteRoleRoute = rolePermissionProcedure(['ROLES_WRITE']).mutation(async ({ ctx, input: { targetedRoleId } }) => RoleService.delete(targetedRoleId))

export default deleteRoleRoute
