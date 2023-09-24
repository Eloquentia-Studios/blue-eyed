import { z } from 'zod'
import authenticatedProcedure from '../../procedures/authenticatedProcedure'
import Privilege from '../../services/privilege'

const canDeleteUserRoute = authenticatedProcedure
  .input(
    z.object({
      affectedUserId: z.string().uuid()
    })
  )
  .query(async ({ ctx: { user }, input: { affectedUserId } }) => Privilege.userHasHigherPrivilege(user.id, affectedUserId, ['USERS_DELETE']))

export default canDeleteUserRoute
