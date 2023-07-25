import { useQueryClient } from '@tanstack/svelte-query'
import trpc from './trpc'

export const canDeleteUser = () => trpc().canDeleteUser.createQuery()

export const canResetPassword = () => trpc().canResetPassword.createQuery()

export const canCreateInvitation = () => trpc().canCreateInvitation.createQuery()

export const canReadRoles = () => trpc().canReadRoles.createQuery()

export const getAllPermissions = () => trpc().getAllPermissions.createQuery()

export const changeRolePermission = () => {
  const queryClient = useQueryClient()
  const client = trpc()

  const getAllRolesQueryKey = client.getAllRoles.getQueryKey()

  return client.changeRolePermission.createMutation({
    onSuccess: () => {
      queryClient.invalidateQueries(getAllRolesQueryKey)
    }
  })
}
