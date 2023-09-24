import logger from '../../services/logging'
import { t } from '../../services/trpc'
import UserService from '../../services/user'

const getCurrentUserRoute = t.procedure.query(async ({ ctx }) => {
  const user = await UserService.getFromRequest(ctx.req)

  if (user) logger.debug(`Got current user which is ${user.displayName} (${user.id})`)
  else logger.debug(`Got no current user`)

  return user
})

export default getCurrentUserRoute
