import type { Response } from 'express'
import logger from '../services/logging'

const sendExpressAndLogError = (res: Response, status: number, expressMessage: string, logMessage: string) => {
  logger.verbose(logMessage)
  res.status(status).send(expressMessage)
}

export default sendExpressAndLogError
