import canDeleteUser from '../routes/permission/canDeleteUserQuery'
import { t } from '../services/trpc'

export const permissionRouter = t.router({
  canDeleteUser
})
