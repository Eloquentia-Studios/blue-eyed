import { z } from 'zod'
import logger from './logging'
import prisma from './prisma'

export const getFlag = async (name: string) => {
  logger.debug(`Getting flag ${name}`)
  const flag = await prisma.flag.findUnique({ where: { name } })

  if (!flag) {
    logger.debug(`Flag ${name} does not exist`)
    return null
  }

  logger.debug(`Flag ${name} has value ${flag.value}`)
  return flag.value
}

export const setFlag = async (name: string, value: number) => {
  logger.debug(`Setting flag ${name} to ${value}`)
  z.number().int().parse(value)
  return await prisma.flag.upsert({
    where: { name },
    update: { value },
    create: { name, value }
  })
}
