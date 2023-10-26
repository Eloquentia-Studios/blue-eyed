import trpc from './trpc'
import {createQuery} from "@tanstack/svelte-query";

export const setupAdminUser = () => trpc().setupAdmin.createMutation()

export const isSetupComplete = () => createQuery<boolean>({
    queryKey: ['isSetupComplete'],
    queryFn: async () => fetch('/api/v1/setup/complete').then(res => res.json())
})
