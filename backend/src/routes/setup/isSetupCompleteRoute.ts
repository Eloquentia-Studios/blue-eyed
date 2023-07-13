import { isSetupComplete } from '../../services/setup'
import { t } from '../../services/trpc'

const isSetupCompleteRoute = t.procedure.query(async () => await isSetupComplete())

export default isSetupCompleteRoute
