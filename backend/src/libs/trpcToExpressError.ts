import type { TRPCError } from '@trpc/server'
import type { TRPC_ERROR_CODE_KEY } from '@trpc/server/dist/rpc/codes'

const trpcToExpressError = (err: TRPCError) => {
  return {
    status: statusToNumber(err.code),
    message: err.message
  }
}

const statusToNumber = (status: TRPC_ERROR_CODE_KEY) => {
  switch (status) {
    case 'PARSE_ERROR':
      return 400
    case 'BAD_REQUEST':
      return 400
    case 'UNAUTHORIZED':
      return 401
    case 'FORBIDDEN':
      return 403
    case 'NOT_FOUND':
      return 404
    case 'METHOD_NOT_SUPPORTED':
      return 405
    case 'TIMEOUT':
      return 408
    case 'CONFLICT':
      return 409
    case 'PRECONDITION_FAILED':
      return 412
    case 'PAYLOAD_TOO_LARGE':
      return 413
    case 'UNPROCESSABLE_CONTENT':
      return 422
    case 'TOO_MANY_REQUESTS':
      return 429
    case 'CLIENT_CLOSED_REQUEST':
      return 499
    default:
      return 500
  }
}

export default trpcToExpressError
