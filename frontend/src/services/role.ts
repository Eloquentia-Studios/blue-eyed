import { useQueryClient } from '@tanstack/svelte-query'
import trpc from './trpc'

export const createRole = () => {
  const client = trpc()
  const queryClient = useQueryClient()

  const getAllRolesQueryKey = client.getAllRoles.getQueryKey()

  return trpc().createRole.createMutation({
    onSuccess: () => {
      queryClient.invalidateQueries(getAllRolesQueryKey)
    }
  })
}

export const getAllRoles = () => trpc().getAllRoles.createQuery()
