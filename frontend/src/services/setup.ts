import trpc from './trpc'

export const setupAdminUser = () => trpc().setupAdmin.createMutation()

export const isSetupComplete = () => trpc().isSetupComplete.createQuery()
