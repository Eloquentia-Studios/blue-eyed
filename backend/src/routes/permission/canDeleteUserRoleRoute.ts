import { z } from 'zod'
import authenticatedProcedure from '../../procedures/authenticatedProcedure'
import { getHighestUserRoleWithPermissions } from '../../services/permission'
import { getOrderedRoles } from '../../services/role'

const canDeleteUserRoleRoute = authenticatedProcedure.input(z.object({ roleId: z.string().uuid() })).query(async ({ ctx, input: { roleId } }) => {
  const highestUserRole = await getHighestUserRoleWithPermissions(ctx.user.id, ['ROLES_WRITE'])
  if (!highestUserRole) return false

  const orderedRoles = await getOrderedRoles()
  const highestRoleIndex = orderedRoles.findIndex((role) => role.id === highestUserRole.id)
  const targetedRoleIndex = orderedRoles.findIndex((role) => role.id === roleId)

  if (targetedRoleIndex === orderedRoles.length - 1) return false
  return targetedRoleIndex > highestRoleIndex
})

export default canDeleteUserRoleRoute
