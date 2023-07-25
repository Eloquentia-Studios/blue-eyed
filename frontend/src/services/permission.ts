import trpc from './trpc'

export const canDeleteUser = () => trpc().canDeleteUser.createQuery()

export const canResetPassword = () => trpc().canResetPassword.createQuery()
