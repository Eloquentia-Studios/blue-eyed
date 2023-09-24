import { z } from 'zod'
import throwAndLogTRPCError from '../../libs/throwAndLogTRPCError'
import permissionProcedure from '../../procedures/permissionProcedure'
import RoleService from '../../services/role'

const createRoleRoute = permissionProcedure(['ROLES_WRITE'])
  .input(
    z.object({
      name: z
        .string()
        .min(3)
        .max(64)
        .regex(/^[a-zA-Z0-9]+$/, 'Role name can only contain alphanumeric characters.')
    })
  )
  .mutation(async ({ ctx, input: { name } }) => {
    const otherRoleWithName = await RoleService.getByName(name)
    if (otherRoleWithName) return throwAndLogTRPCError('BAD_REQUEST', 'Role with given name already exists.', `${ctx.user.displayName} tried to create a role with name ${name} which already exists.`)

    const userRole = await RoleService.getByName('User')
    if (!userRole) return throwAndLogTRPCError('INTERNAL_SERVER_ERROR', 'User role does not exist.', `${ctx.user.displayName} tried to create a role but the user role does not exist.`)

    const role = await RoleService.create(name)
    await RoleService.moveBeforeOther(role.id, userRole.id)
  })

export default createRoleRoute
