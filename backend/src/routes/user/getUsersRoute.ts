import authenticatedProcedure from '../../procedures/authenticatedProcedure'
import { getUsers } from '../../services/user'

const getUsersRoute = authenticatedProcedure.query(() => getUsers())

export default getUsersRoute
