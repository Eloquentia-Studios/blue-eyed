import type { QueryClient } from '@tanstack/svelte-query'
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import type { inferRouterOutputs } from '@trpc/server'
import { svelteQueryWrapper } from 'trpc-svelte-query-adapter'
import type { AppRouter } from '../../../backend/src/routers/appRouter'

const client = createTRPCProxyClient<AppRouter>({
  links: [httpBatchLink({ url: '/trpc' })]
})

const trpc = (queryClient?: QueryClient) =>
  svelteQueryWrapper<AppRouter>({
    client,
    queryClient
  })

export default trpc

export type RouterOutput = inferRouterOutputs<AppRouter>
