import authenticatedProcedure from '../procedures/authenticatedProcedure.js'
import { t } from '../services/trpc.js'
import { getUsers } from '../services/user.js'

export const userRouter = t.router({
  getUsers: authenticatedProcedure.query(() => getUsers())
})
