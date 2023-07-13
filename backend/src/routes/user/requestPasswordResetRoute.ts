import { z } from 'zod'
import authenticatedProcedure from '../../procedures/authenticatedProcedure'
import { generateResetToken } from '../../services/user'

const requestPasswordResetRoute = authenticatedProcedure.input(z.string()).mutation(({ input: userId }) => generateResetToken(userId))

export default requestPasswordResetRoute
