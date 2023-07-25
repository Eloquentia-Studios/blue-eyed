import permissionProcedure from '../../procedures/permissionProcedure'

const canCreateInvitationQuery = permissionProcedure(['USERS_INVITE']).query(() => true)

export default canCreateInvitationQuery
