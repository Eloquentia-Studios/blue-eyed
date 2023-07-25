import changeRolePermission from '../routes/role/changeRolePermissionRoute'
import createRole from '../routes/role/createRoleRoute'
import getAllRoles from '../routes/role/getAllRolesQuery'
import { t } from '../services/trpc'

export const roleRouter = t.router({
  createRole,

  getAllRoles,

  changeRolePermission
})
