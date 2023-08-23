import { useQueryClient } from '@tanstack/svelte-query'
import trpc from './trpc'

export const canDeleteUser = () => trpc().canDeleteUser.createQuery()

export const canResetPassword = () => trpc().canResetPassword.createQuery()

export const canCreateInvitation = () => trpc().canCreateInvitation.createQuery()

export const canWriteRoles = () => trpc().canWriteRoles.createQuery()

export const canReadRoles = () => trpc().canReadRoles.createQuery()

export const canChangeUserRoles = () => trpc().canChangeUserRoles.createQuery()

export const getAllPermissions = () => trpc().getAllPermissions.createQuery()

export const canMoveRole = (roleId: string) => trpc().canMoveRole.createQuery({ roleId })

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
