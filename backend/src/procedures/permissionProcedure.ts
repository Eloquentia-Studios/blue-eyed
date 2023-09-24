import type { Permission } from '@prisma/client'
import throwAndLogTRPCError from '../libs/throwAndLogTRPCError'
import throwTRPCError from '../libs/throwTRPCError'
import PermissionService from '../services/permission'
import authenticatedProcedure from './authenticatedProcedure'

const permissionProcedure = (permissions: Permission[], shouldLog = true) =>
  authenticatedProcedure.use(async ({ ctx, next }) => {
    const hasPermission = await PermissionService.userHasPermissions(ctx.user.id, permissions)

    if (!hasPermission) {
      if (shouldLog) return throwAndLogTRPCError('FORBIDDEN', 'forbidden', `User ${ctx.user.username} tried to access a route without the required permissions ${permissions.join(', ')}.`, 'warn')
      else return throwTRPCError('FORBIDDEN', 'forbidden')
    }

    return next({ ctx })
  })

export default permissionProcedure
