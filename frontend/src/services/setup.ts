import trpc from './trpc'

export const isSetupComplete = () => trpc().isSetupComplete.createQuery()
