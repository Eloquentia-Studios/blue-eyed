import prisma from './prisma.js'

export const isSetupComplete = async () => {
  const status = await prisma.status.findUnique({
    where: {
      name: 'setupComplete'
    }
  })

  return status && status.value === 'true'
}

export const completeSetup = async () => {
  await prisma.status.upsert({
    where: {
      name: 'setupComplete'
    },
    update: {
      value: 'true'
    },
    create: {
      name: 'setupComplete',
      value: 'true'
    }
  })
}
