import type { Permission, PrismaClient, Role } from '@prisma/client'
import { deleteCache, getCache, setCache } from './cache'
import logger from './logging'
import { allPermissions } from './permission'
import prisma, { PrismaTransactionClient } from './prisma'

export const createRole = async (name: string, previous?: string, permissions: Permission[] = [], lockedPosition?: boolean) => {
  if (permissions.length === 0) {
    logger.verbose(`Creating role ${name} with no permissions`)
  } else {
    logger.verbose(`Creating role ${name} with permissions ${permissions.join(', ')}`)
  }

  const role = await prisma.role.create({
    data: {
      name,
      lockedPosition,
      permissions: {
        set: permissions
      },
      previous: {
        connect: previous ? { id: previous } : undefined
      }
    }
  })

  return role
}

export const moveRoleBefore = async (roleId: string, nextId: string) => {
  await prisma.$transaction(async (tx) => {
    logger.debug(`Moving role ${roleId} before ${nextId}`)

    const role = await getRoleById(roleId)
    if (!role) {
      logger.debug(`Could not find role with id ${roleId}`)
      throw new Error('Role not found')
    }

    if (role.lockedPosition) {
      logger.debug(`Role ${roleId} is locked`)
      throw new Error('Role is locked')
    }

    if (role.previous && role.next) await connectRoles(tx, role.previous, role.next)
    await disconnectRole(tx, role)

    const nextRole = await getRoleById(nextId)
    if (!nextRole) {
      logger.debug(`Could not find role with id ${nextId}`)
      throw new Error('Role not found')
    }

    await connectRoles(tx, role, nextRole)
    if (nextRole.previous) await connectRoles(tx, nextRole.previous, role)

    logger.debug(`Moved role ${roleId} before ${nextId}`)
  })

  await deleteCache('ordered-roles')
}

export const getRoleById = async (id: string) => {
  logger.debug(`Getting role with id ${id}`)
  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      previous: true,
      next: true
    }
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

  const superAdminRole = await createRole('SuperAdmin', undefined, allPermissions())
  logger.info('Created SuperAdmin role')

  await createRole('User', superAdminRole.id)
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

export const getOrderedRoles = async () => {
  logger.debug('Getting ordered roles')

  const cachedRoles = await getCache<Role[]>('ordered-roles')

  if (cachedRoles) {
    logger.debug(`Found ${cachedRoles.length} cached roles, returning those.`)
    return cachedRoles
  }

  const roles = await prisma.$queryRaw<Role[]>`
    WITH RECURSIVE roles AS (
      SELECT *, 1 AS level 
      FROM "Role"
      WHERE name = 'User' 
      UNION ALL
      SELECT r.*, level + 1
      FROM "Role" r
      INNER JOIN roles ON roles."previousId" = r.id
    )
    SELECT *
    FROM roles
    ORDER BY level DESC 
  `

  logger.debug(`Found ${roles.length} roles, caching those.`)
  await setCache('ordered-roles', roles)

  return roles
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

  prisma.$transaction(async (tx) => {
    if (role.previous && role.next) await connectRoles(tx, role.previous, role.next)
    await disconnectRole(tx, role)

    await tx.role.delete({
      where: { id: roleId }
    })
  })

  await deleteCache('ordered-roles')

  logger.debug(`Deleted role ${roleId}`)
}

const connectRoles = async (tx: PrismaTransactionClient | PrismaClient, a: Role, b: Role) =>
  tx.role.update({
    where: { id: a.id },
    data: {
      next: {
        connect: { id: b.id }
      }
    }
  })

const disconnectRole = async (tx: PrismaTransactionClient | PrismaClient, role: Role) =>
  tx.role.update({
    where: { id: role.id },
    data: {
      next: {
        disconnect: true
      },
      previous: {
        disconnect: true
      }
    }
  })
