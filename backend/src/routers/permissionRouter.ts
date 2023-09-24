import canCreateInvitation from '../routes/permission/canCreateInvitationQuery'
import canDeleteUserRole from '../routes/permission/canDeleteUserRoleRoute'
import canMoveRole from '../routes/permission/canMoveRoleRoute'
import canReadRoles from '../routes/permission/canReadRolesRoute'
import canResetPassword from '../routes/permission/canResetPasswordRoute'
import canWriteRoles from '../routes/permission/canWriteRolesRoute'
import getAllPermissions from '../routes/permission/getAllPermissionsQuery'
import { t } from '../services/trpc'
import canChangeUserRoles from './../routes/permission/canChangeUserRolesRoute'
import canDeleteUser from './../routes/permission/canDeleteUserRoute'

export const permissionRouter = t.router({
  getAllPermissions,

  canDeleteUser,
  canResetPassword,
  canCreateInvitation,
  canReadRoles,
  canWriteRoles,
  canChangeUserRoles,
  canMoveRole,
  canDeleteUserRole
})
