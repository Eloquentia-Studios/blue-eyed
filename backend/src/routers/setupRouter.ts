import isSetupComplete from '../routes/setup/isSetupCompleteRoute'
import setupAdmin from '../routes/setup/setupAdminRoute'
import { t } from '../services/trpc'

export const setupRouter = t.router({
  setupAdmin,

  isSetupComplete
})
