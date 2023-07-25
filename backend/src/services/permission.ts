import { Permission } from '@prisma/client'

export const allPermissions = () => Object.values(Permission)
