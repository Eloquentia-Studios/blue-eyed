import type { TRPC_ERROR_CODE_KEY } from '@trpc/server/dist/rpc/codes'
import logger from '../services/logging'
import throwTRPCError from './throwTRPCError'

const throwAndLogTRPCError = (code: TRPC_ERROR_CODE_KEY, trpcMessage: string, logMessage: string, logLevel = 'verbose') => {
  logger.log(logLevel, logMessage)

  return throwTRPCError(code, trpcMessage)
}

export default throwAndLogTRPCError
