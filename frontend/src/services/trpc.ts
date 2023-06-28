import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '../../../backend/src/routers/appRouter'

const trpc = createTRPCProxyClient<AppRouter>({
  links: [httpBatchLink({ url: '/trpc' })]
})

export default trpc

export type RouterOutput = inferRouterOutputs<AppRouter>
