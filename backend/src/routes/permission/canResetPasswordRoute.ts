import { z } from 'zod'
import authenticatedProcedure from '../../procedures/authenticatedProcedure'
import Privilege from '../../services/privilege'

const canResetPasswordRoute = authenticatedProcedure
  .input(
    z.object({
      affectedUserId: z.string().uuid()
    })
  )
  .query(async ({ ctx: { user }, input: { affectedUserId } }) => {
    // If the user is trying to reset their own password, allow it
    if (user.id === affectedUserId) return true

    return Privilege.userHasHigherPrivilege(user.id, affectedUserId, ['USERS_WRITE'])
  })

export default canResetPasswordRoute
