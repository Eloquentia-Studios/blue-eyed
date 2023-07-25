import permissionProcedure from '../../procedures/permissionProcedure'

const canDeleteUserQuery = permissionProcedure(['USERS_DELETE']).query(() => true)

export default canDeleteUserQuery
