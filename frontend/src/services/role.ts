import trpc from './trpc'

export const getAllRoles = () => trpc().getAllRoles.createQuery()
