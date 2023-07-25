import { PrismaClient } from '@prisma/client'
import logger from './logging'

const prisma = new PrismaClient()
logger.debug('Prisma client initialized')

export default prisma
