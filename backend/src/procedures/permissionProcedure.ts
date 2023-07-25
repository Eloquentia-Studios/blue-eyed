import type { Permission } from '@prisma/client'
import throwAndLogTRPCError from '../libs/throwAndLogTRPCError'
import { userHasPermissions } from '../services/permission'
import authenticatedProcedure from './authenticatedProcedure'

const permissionProcedure = (permissions: Permission[], shouldLog = true) =>
  authenticatedProcedure.use(async ({ ctx, next }) => {
    const hasPermission = await userHasPermissions(ctx.user.id, permissions)

    if (!hasPermission) return throwAndLogTRPCError('FORBIDDEN', 'forbidden', `User ${ctx.user.username} tried to access a route without the required permissions ${permissions.join(', ')}.`, 'warn')

    return next({ ctx })
  })

export default permissionProcedure
