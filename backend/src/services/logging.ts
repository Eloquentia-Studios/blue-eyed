import { createLogger, format, transports } from 'winston'

const logLevel = process.env.LOG_LEVEL || 'warn'

const errorFileTransport = new transports.File({ filename: 'logs/error.log', level: 'error', format: format.uncolorize() })
const combinedFileTransport = new transports.File({ filename: 'logs/combined.log', format: format.uncolorize() })
const consoleTransport = new transports.Console({ level: logLevel })

const logger = createLogger({
  level: logLevel,
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.colorize({
      colors: {
        info: 'blue',
        error: 'red',
        warn: 'yellow',
        debug: 'green'
      }
    }),
    format.simple(),
    format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
  ),
  transports: [errorFileTransport, combinedFileTransport, consoleTransport]
})

export default logger
