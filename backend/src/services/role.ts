import type { Permission } from '@prisma/client'
import logger from './logging'
import { allPermissions } from './permission'
import prisma from './prisma'

export const createRole = async (name: string, permissions: Permission[] = []) => {
  if (permissions.length === 0) {
    logger.verbose(`Creating role ${name} with no permissions`)
  } else {
    logger.verbose(`Creating role ${name} with permissions ${permissions.join(', ')}`)
  }

  const role = await prisma.role.create({
    data: {
      name,
      permissions: {
        set: permissions
      }
    }
  })

  return role
}

export const getRoleById = async (id: string) => {
  logger.debug(`Getting role with id ${id}`)
  const role = await prisma.role.findUnique({
    where: { id }
  })

  if (!role) {
    logger.debug(`Could not find role with id ${id}`)
    return null
  }

  logger.debug(`Role with id ${id} was ${role.name}`)
  return role
}

export const getRoleByName = async (name: string) => {
  logger.debug(`Getting role with name ${name}`)
  const role = await prisma.role.findUnique({
    where: { name }
  })

  if (!role) {
    logger.debug(`Could not find role with name ${name}`)
    return null
  }

  logger.debug(`Found role with name ${name} and id ${role.id}`)
  return role
}

export const createDefaultRoles = async () => {
  logger.info('Creating default roles')

  await createRole('SuperAdmin', allPermissions())
  logger.info('Created SuperAdmin role')

  await createRole('User')
  logger.info('Created User role')

  logger.info('Default roles created')
}

export const getUserRoles = async (userId: string) => {
  // I didn't really know where to put this, so I put it here. But it could also be in the user service.

  logger.debug(`Getting roles for user ${userId}`)
  const roles = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      roles: true
    }
  })

  if (!roles) {
    logger.debug(`Could not find roles for user ${userId}`)
    return []
  }

  logger.debug(`Found roles for user ${userId}`)

  return roles ? roles.roles : []
}

export const getAllRoles = async () => {
  logger.debug('Getting all roles')
  const roles = await prisma.role.findMany()

  logger.debug(`Found ${roles.length} roles`)
  return roles
}
