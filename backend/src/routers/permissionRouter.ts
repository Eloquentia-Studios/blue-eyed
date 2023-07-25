import canCreateInvitation from '../routes/permission/canCreateInvitationQuery'
import canDeleteUser from '../routes/permission/canDeleteUserQuery'
import canResetPassword from '../routes/permission/canResetPasswordQuery'
import { t } from '../services/trpc'

export const permissionRouter = t.router({
  canDeleteUser,
  canResetPassword,
  canCreateInvitation
})
