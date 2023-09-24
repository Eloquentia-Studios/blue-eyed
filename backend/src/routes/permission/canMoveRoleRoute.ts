import { z } from 'zod'
import authenticatedProcedure from '../../procedures/authenticatedProcedure'
import Privilege from '../../services/privilege'

const canMoveRoleRoute = authenticatedProcedure.input(z.object({ roleId: z.string().uuid() })).query(async ({ ctx, input: { roleId } }) => Privilege.getRoleMovableDirections(ctx.user.id, roleId))

export default canMoveRoleRoute
