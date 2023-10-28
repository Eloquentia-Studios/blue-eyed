import trpc from './trpc'
import {createMutation, createQuery} from "@tanstack/svelte-query";
import type { UserRegistrationInfo } from "../../../backend/bindings/UserRegistrationInfo"
import type {ApiError} from "../../../backend/bindings/ApiError";

export const setupAdminUser = () => createMutation<undefined, ApiError | Error, UserRegistrationInfo>({
    mutationKey: ['setupAdminUser'],
    mutationFn: async (registrationInfo: UserRegistrationInfo) => {
        let response = await fetch("/api/v1/setup/admin", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(registrationInfo)
        })

        if (!response.ok) {
            throw await response.json() as ApiError
        }
    }
})

export const isSetupComplete = () => createQuery<boolean>({
    queryKey: ['isSetupComplete'],
    queryFn: async () => await fetch('/api/v1/setup/complete').then(res => res.json())
})
