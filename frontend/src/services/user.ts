import {createQuery, useQueryClient} from '@tanstack/svelte-query'
import trpc from './trpc'
import type {User} from "../types/user";
import Api from "./api";

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

export const getCurrentUser = () => createQuery<User | null>({
  queryKey: ["currentUser"],
  queryFn: () => Api.get<null>('api/v1/user')
})

export const getUsers = () => trpc().getUsers.createQuery()

export const requestPasswordReset = () => trpc().requestPasswordReset.createMutation()

export const resetPassword = () => trpc().resetUserPassword.createMutation()

export const getRedirectToken = () => trpc().getRedirectToken.createMutation()
