import { getFlag, setFlag } from './flag'
import logger from './logging'

enum Setup {
  complete = 1,
  incomplete = 0
}

export const isSetupComplete = async () => {
  const setupFlag = await getFlag('setup')

  const isSetupComplete = setupFlag === Setup.complete
  logger.debug(`Setup is marked as ${isSetupComplete ? 'complete' : 'incomplete'}`)
  return isSetupComplete
}

export const completeSetup = async () => {
  logger.debug('Marking setup as complete')
  return await setFlag('setup', Setup.complete)
}
