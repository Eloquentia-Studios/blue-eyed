import rolePermissionProcedure from '../../procedures/rolePermissionProcedure'
import { deleteRole } from '../../services/role'

const deleteRoleRoute = rolePermissionProcedure(['ROLES_WRITE']).mutation(async ({ ctx, input: { targetedRoleId } }) => deleteRole(targetedRoleId))

export default deleteRoleRoute
