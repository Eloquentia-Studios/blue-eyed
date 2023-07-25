import trpc from './trpc'

export const canDeleteUser = () => trpc().canDeleteUser.createQuery()

export const canResetPassword = () => trpc().canResetPassword.createQuery()

export const canCreateInvitation = () => trpc().canCreateInvitation.createQuery()

export const getAllPermissions = () => trpc().getAllPermissions.createQuery()
