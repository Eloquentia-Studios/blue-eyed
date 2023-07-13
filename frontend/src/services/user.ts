import { useQueryClient } from '@tanstack/svelte-query'
import trpc from './trpc'

export const deleteUser = () => {
  const queryClient = useQueryClient()
  const client = trpc()

  const userQueryKey = client.getUsers.getQueryKey()

  return client.deleteUser.createMutation({
    onSuccess: () => {
      queryClient.invalidateQueries(userQueryKey)
    }
  })
}

export const authorizeUser = () => trpc().authorize.createMutation()

export const createUser = () => trpc().registerUser.createMutation()

export const getCurrentUser = () => trpc().getCurrentUser.createQuery()

export const getUsers = () => trpc().getUsers.createQuery()

export const requestPasswordReset = () => trpc().requestPasswordReset.createMutation()

export const resetPassword = () => trpc().resetUserPassword.createMutation()

export const getRedirectToken = () => trpc().getRedirectToken.createMutation()
