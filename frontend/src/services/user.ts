import {createMutation, createQuery, useQueryClient} from '@tanstack/svelte-query'
import trpc from './trpc'
import type {User} from "../types/user";
import Api from "./api";
import type {LoginCredentials} from "../../../backend/bindings/LoginCredentials";
import type {ApiError} from "../../../backend/bindings/ApiError";

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

export const authorizeUser = () => createMutation<undefined, ApiError | Error, LoginCredentials>({
    mutationKey: ["authorizeUser"],
    mutationFn: (loginCredentials) => Api.post<undefined>('api/v1/auth/login', loginCredentials)
})

export const createUser = () => trpc().registerUser.createMutation()

export const getCurrentUser = () => createQuery<User | null>({
    queryKey: ["currentUser"],
    queryFn: () => Api.get<null>('api/v1/user')
})

export const getUsers = () => trpc().getUsers.createQuery()

export const requestPasswordReset = () => trpc().requestPasswordReset.createMutation()

export const resetPassword = () => trpc().resetUserPassword.createMutation()

export const getRedirectToken = () => trpc().getRedirectToken.createMutation()
