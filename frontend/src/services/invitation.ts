import trpc from './trpc'

export const createUserInvitation = () => trpc().createUserInvitation.createMutation()
