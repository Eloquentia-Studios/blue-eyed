import FlagService from './flag'
import logger from './logging'

enum Setup {
  complete = 1,
  incomplete = 0
}

export default class SetupService {
  public static async isComplete() {
    const setupFlag = await FlagService.get('setup')

    const isSetupComplete = setupFlag === Setup.complete
    logger.debug(`Setup is marked as ${isSetupComplete ? 'complete' : 'incomplete'}`)
    return isSetupComplete
  }

  public static async markComplete() {
    logger.debug('Marking setup as complete')
    return await FlagService.set('setup', Setup.complete)
  }
}
