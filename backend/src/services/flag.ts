import { z } from 'zod'
import prisma from './prisma'

export const getFlag = async (name: string) => {
  const flag = await prisma.flag.findUnique({
    where: {
      name
    }
  })

  if (!flag) return null
  return flag.value
}

export const setFlag = async (name: string, value: number) => {
  z.number().int().parse(value)

  return prisma.flag.upsert({
    where: { name },
    update: { value },
    create: { name, value }
  })
}
