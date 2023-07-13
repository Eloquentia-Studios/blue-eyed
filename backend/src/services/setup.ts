import { getFlag, setFlag } from './flag'

enum Setup {
  complete = 1,
  incomplete = 0
}

export const isSetupComplete = async () => (await getFlag('setup')) === Setup.complete

export const completeSetup = async () => setFlag('setup', Setup.complete)
