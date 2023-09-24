import { z } from 'zod'
import authenticatedProcedure from '../../procedures/authenticatedProcedure'
import PrivilegeService from '../../services/privilege'

const canMoveRoleRoute = authenticatedProcedure.input(z.object({ roleId: z.string().uuid() })).query(async ({ ctx, input: { roleId } }) => PrivilegeService.getRoleMovableDirections(ctx.user.id, roleId))

export default canMoveRoleRoute
