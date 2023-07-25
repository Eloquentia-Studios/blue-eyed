import permissionProcedure from '../../procedures/permissionProcedure'

const canDeletePasswordQuery = permissionProcedure(['RESET_USER_PASSWORD']).query(() => true)

export default canDeletePasswordQuery
