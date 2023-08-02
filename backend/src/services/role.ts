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

export const getUsersWithRole = async (roleId: string) => {
  logger.debug(`Getting users with role ${roleId}`)

  const users = await prisma.user.findMany({
    where: {
      roles: {
        some: {
          id: roleId
        }
      }
    }
  })

  logger.debug(`Found ${users.length} users with role ${roleId}`)
  return users
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

export const setUserRoleStatus = async (userId: string, roleId: string, enabled: boolean) => {
  logger.debug(`Setting role ${roleId} for user ${userId} to ${enabled}`)

  const role = await getRoleById(roleId)
  if (!role) {
    logger.debug(`Could not find role with id ${roleId}`)
    throw new Error('Role not found')
  }

  if (role.name === 'User') {
    logger.debug('Cannot change status of User role')
    throw new Error('Cannot change status of User role')
  }

  if (role.name === 'SuperAdmin' && !enabled) {
    const usersWithRole = await getUsersWithRole(roleId)
    if (usersWithRole.length <= 1) {
      logger.debug('Cannot remove last SuperAdmin')
      throw new Error('Cannot remove last SuperAdmin')
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      roles: {
        connect: enabled ? [{ id: roleId }] : [],
        disconnect: !enabled ? [{ id: roleId }] : []
      }
    }
  })

  logger.debug(`Set role ${roleId} for user ${userId} to ${enabled}`)
}

export const getAllRoles = async () => {
  logger.debug('Getting all roles')
  const roles = await prisma.role.findMany({
    orderBy: {
      name: 'asc'
    }
  })

  logger.debug(`Found ${roles.length} roles`)
  return roles
}

export const deleteRole = async (roleId: string) => {
  logger.debug(`Deleting role ${roleId}`)

  const role = await getRoleById(roleId)
  if (!role) {
    logger.debug(`Could not find role with id ${roleId}`)
    throw new Error('Role not found')
  }

  if (role.name === 'User') {
    logger.debug('Cannot delete User role')
    throw new Error('Cannot delete User role')
  }

  if (role.name === 'SuperAdmin') {
    logger.debug('Cannot delete SuperAdmin role')
    throw new Error('Cannot delete SuperAdmin role')
  }

  await prisma.role.delete({
    where: { id: roleId }
  })

  logger.debug(`Deleted role ${roleId}`)
}
