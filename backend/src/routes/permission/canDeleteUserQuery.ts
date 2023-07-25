import permissionProcedure from '../../procedures/permissionProcedure'

const canDeleteUserQuery = permissionProcedure(['DELETE_USER']).query(() => true)

export default canDeleteUserQuery
