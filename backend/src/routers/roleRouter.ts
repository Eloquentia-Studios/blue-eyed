import getAllRoles from '../routes/role/getAllRolesQuery'
import { t } from '../services/trpc'

export const roleRouter = t.router({
  getAllRoles
})
