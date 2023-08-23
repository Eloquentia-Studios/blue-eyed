import { TRPCError } from '@trpc/server'
import type { TRPC_ERROR_CODE_KEY } from '@trpc/server/dist/rpc/codes'

const throwTRPCError = (code: TRPC_ERROR_CODE_KEY, trpcMessage: string) => {
  throw new TRPCError({
    code,
    message: trpcMessage
  })
}

export default throwTRPCError
