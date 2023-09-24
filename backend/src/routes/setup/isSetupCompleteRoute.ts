import logger from '../../services/logging'
import SetupService from '../../services/setup'
import { t } from '../../services/trpc'

const isSetupCompleteRoute = t.procedure.query(async () => {
  const setupComplete = await SetupService.isComplete()
  logger.debug(`Setup is ${!setupComplete ? 'not ' : ''}complete`)
  return setupComplete
})

export default isSetupCompleteRoute
