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

export const getUserRoles = (userId: string) => trpc().getUserRoles.createQuery({ userId })

export const setUserRoleStatus = () => {
  const client = trpc()
  const queryClient = useQueryClient()

  return trpc().setUserRoleStatus.createMutation({
    onSuccess: (_, variables) => {
      const userRolesQueryKey = client.getUserRoles.getQueryKey({ userId: variables.userId })
      queryClient.invalidateQueries(userRolesQueryKey)
    }
  })
}

export const deleteRole = () => {
  const client = trpc()
  const queryClient = useQueryClient()

  const getAllRolesQueryKey = client.getAllRoles.getQueryKey()

  return trpc().deleteRole.createMutation({
    onSuccess: () => {
      queryClient.invalidateQueries(getAllRolesQueryKey)
    }
  })
}

export const moveRoleBefore = () => {
  const client = trpc()
  const queryClient = useQueryClient()

  const getAllRolesQueryKey = client.getAllRoles.getQueryKey()

  return trpc().moveRoleBefore.createMutation({
    onSuccess: () => {
      queryClient.invalidateQueries(getAllRolesQueryKey)
      queryClient.invalidateQueries({ predicate: (query) => (query.queryKey[0] as string[]).includes('canMoveRole') })
      queryClient.invalidateQueries({ predicate: (query) => (query.queryKey[0] as string[]).includes('canDeleteUserRole') })
    }
  })
}
