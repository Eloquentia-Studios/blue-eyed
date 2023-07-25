import type { Permission } from '@prisma/client'
import throwAndLogTRPCError from '../libs/throwAndLogTRPCError'
import { userHasPermissions } from '../services/permission'
import authenticatedProcedure from './authenticatedProcedure'

const permissionProcedure = (permissions: Permission[]) =>
  authenticatedProcedure.use(async ({ ctx, next }) => {
    const hasPermission = await userHasPermissions(ctx.user.id, permissions)

    if (!hasPermission) return throwAndLogTRPCError('FORBIDDEN', 'Forbidden', `User ${ctx.user.id} tried to access a route without permissions ${permissions.join(', ')}`, 'warn')

    return next({ ctx })
  })

export default permissionProcedure
