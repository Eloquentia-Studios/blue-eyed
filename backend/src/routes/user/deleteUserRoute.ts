import { z } from 'zod'
import authenticatedProcedure from '../../procedures/authenticatedProcedure'
import { deleteUser } from '../../services/user'

const deleteUserRoute = authenticatedProcedure.input(z.string()).mutation(async ({ input: userId }) => deleteUser(userId))

export default deleteUserRoute
