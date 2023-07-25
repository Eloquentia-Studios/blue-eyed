import canCreateInvitation from '../routes/permission/canCreateInvitationQuery'
import canDeleteUser from '../routes/permission/canDeleteUserQuery'
import canReadRoles from '../routes/permission/canReadRolesRoute'
import canResetPassword from '../routes/permission/canResetPasswordQuery'
import getAllPermissions from '../routes/permission/getAllPermissionsQuery'
import { t } from '../services/trpc'

export const permissionRouter = t.router({
  getAllPermissions,

  canDeleteUser,
  canResetPassword,
  canCreateInvitation,
  canReadRoles
})
