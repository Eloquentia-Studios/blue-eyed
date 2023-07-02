import { useQueryClient } from '@tanstack/svelte-query'
import trpc from './trpc'

export const useDeleteUser = () => {
  const queryClient = useQueryClient()

  const client = trpc()

  const userQueryKey = client.getUsers.getQueryKey()

  const deleteUser = trpc().deleteUser.createMutation({
    onSuccess: () => {
      queryClient.invalidateQueries(userQueryKey)
    }
  })

  return deleteUser
}
