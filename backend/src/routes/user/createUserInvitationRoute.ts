import authenticatedProcedure from '../../procedures/authenticatedProcedure'
import { generateInvitationToken } from '../../services/invitation'

const createUserInvitationRoute = authenticatedProcedure.mutation(() => generateInvitationToken())

export default createUserInvitationRoute
