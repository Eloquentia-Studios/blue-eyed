import { z } from 'zod'
import prisma from './prisma'

export const getFlag = async (name: string) => (await prisma.flag.findUnique({ where: { name } }))?.value ?? null

export const setFlag = async (name: string, value: number) => {
  z.number().int().parse(value)

  return prisma.flag.upsert({
    where: { name },
    update: { value },
    create: { name, value }
  })
}
