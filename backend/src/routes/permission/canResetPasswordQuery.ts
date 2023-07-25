import permissionProcedure from '../../procedures/permissionProcedure'

const canDeletePasswordQuery = permissionProcedure(['USERS_INVITE']).query(() => true)

export default canDeletePasswordQuery
