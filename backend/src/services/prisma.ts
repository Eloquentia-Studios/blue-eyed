import type { Prisma } from '@prisma/client'
import { PrismaClient } from '@prisma/client'
import type { DefaultArgs } from '@prisma/client/runtime/library'
import logger from './logging'

const prisma = new PrismaClient()
logger.debug('Prisma client initialized')

export type PrismaTransactionClient = Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

export default prisma
