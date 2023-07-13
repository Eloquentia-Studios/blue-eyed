import createUserInvitation from '../routes/user/createUserInvitationRoute'
import deleteUser from '../routes/user/deleteUserRoute'
import getCurrentUser from '../routes/user/getCurrentUserRoute'
import getUsers from '../routes/user/getUsersRoute'
import registerUser from '../routes/user/registerUserRoute'
import requestPasswordReset from '../routes/user/requestPasswordResetRoute'
import resetUserPassword from '../routes/user/resetUserPasswordRoute'
import { t } from '../services/trpc'

export const userRouter = t.router({
  createUserInvitation,
  registerUser,
  requestPasswordReset,

  getUsers,
  getCurrentUser,

  resetUserPassword,

  deleteUser
})
