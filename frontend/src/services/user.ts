import { useQueryClient } from '@tanstack/svelte-query'
import trpc from './trpc'

export const deleteUser = () => {
  const queryClient = useQueryClient()

  const client = trpc()

  const userQueryKey = client.getUsers.getQueryKey()

  const deleteUser = client.deleteUser.createMutation({
    onSuccess: () => {
      queryClient.invalidateQueries(userQueryKey)
    }
  })

  return deleteUser
}

export const getCurrentUser = () => trpc().getCurrentUser.createQuery()

export const requestPasswordReset = () => trpc().requestPasswordReset.createMutation()
