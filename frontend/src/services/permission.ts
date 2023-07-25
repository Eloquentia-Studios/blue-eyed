import trpc from './trpc'

export const canDeleteUser = () => trpc().canDeleteUser.createQuery()
