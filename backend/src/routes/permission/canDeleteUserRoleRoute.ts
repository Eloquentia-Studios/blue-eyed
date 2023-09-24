import { z } from 'zod'
import authenticatedProcedure from '../../procedures/authenticatedProcedure'
import PrivilegeService from '../../services/privilege'

const canDeleteUserRoleRoute = authenticatedProcedure.input(z.object({ roleId: z.string().uuid() })).query(async ({ ctx, input: { roleId } }) => PrivilegeService.canUserDeleteRole(ctx.user.id, roleId))

export default canDeleteUserRoleRoute
