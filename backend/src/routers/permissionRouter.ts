import canCreateInvitation from '../routes/permission/canCreateInvitationQuery'
import canDeleteUser from '../routes/permission/canDeleteUserQuery'
import canReadRoles from '../routes/permission/canReadRolesRoute'
import canResetPassword from '../routes/permission/canResetPasswordQuery'
import canWriteRoles from '../routes/permission/canWriteRolesRoute'
import getAllPermissions from '../routes/permission/getAllPermissionsQuery'
import { t } from '../services/trpc'
import canChangeUserRoles from './../routes/permission/canChangeUserRolesRoute'

export const permissionRouter = t.router({
  getAllPermissions,

  canDeleteUser,
  canResetPassword,
  canCreateInvitation,
  canReadRoles,
  canWriteRoles,
  canChangeUserRoles
})
