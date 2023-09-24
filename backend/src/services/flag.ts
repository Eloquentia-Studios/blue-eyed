import { z } from 'zod'
import logger from './logging'
import prisma from './prisma'

export default class FlagService {
  public static async get(name: string) {
    logger.debug(`Getting flag ${name}`)
    const flag = await prisma.flag.findUnique({ where: { name } })

    if (!flag) {
      logger.debug(`Flag ${name} does not exist`)
      return null
    }

    logger.debug(`Flag ${name} has value ${flag.value}`)
    return flag.value
  }

  public static async set(name: string, value: number) {
    logger.debug(`Setting flag ${name} to ${value}`)
    z.number().int().parse(value)
    return await prisma.flag.upsert({
      where: { name },
      update: { value },
      create: { name, value }
    })
  }
}
