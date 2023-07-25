import { z } from 'zod'
import throwAndLogTRPCError from '../../libs/throwAndLogTRPCError'
import permissionProcedure from '../../procedures/permissionProcedure'
import { createRole, getRoleByName } from '../../services/role'

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
    const otherRoleWithName = await getRoleByName(name)
    if (otherRoleWithName) return throwAndLogTRPCError('BAD_REQUEST', 'Role with given name already exists.', `${ctx.user.displayName} tried to create a role with name ${name} which already exists.`)

    await createRole(name)
  })

export default createRoleRoute
