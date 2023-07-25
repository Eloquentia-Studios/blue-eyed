import { TRPCError } from '@trpc/server'
import type { TRPC_ERROR_CODE_KEY } from '@trpc/server/dist/rpc/codes'
import logger from '../services/logging'

const throwAndLogTRPCError = (code: TRPC_ERROR_CODE_KEY, trpcMessage: string, logMessage: string, logLevel = 'verbose') => {
  logger.log(logLevel, logMessage)

  throw new TRPCError({
    code,
    message: trpcMessage
  })
}

export default throwAndLogTRPCError
