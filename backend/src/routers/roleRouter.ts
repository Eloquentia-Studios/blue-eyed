import changeRolePermission from '../routes/role/changeRolePermissionRoute'
import createRole from '../routes/role/createRoleRoute'
import deleteRole from '../routes/role/deleteRoleRoute'
import getAllRoles from '../routes/role/getAllRolesQuery'
import moveRoleBefore from '../routes/role/moveRoleBeforeRoute'
import { t } from '../services/trpc'
import getUserRoles from './../routes/role/getUserRolesRoute'
import setUserRoleStatus from './../routes/role/setUserRoleStatusRoute'

export const roleRouter = t.router({
  createRole,

  getAllRoles,
  getUserRoles,

  changeRolePermission,
  setUserRoleStatus,
  moveRoleBefore,

  deleteRole
})
