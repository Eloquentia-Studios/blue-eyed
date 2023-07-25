import permissionProcedure from '../../procedures/permissionProcedure'

const canCreateInvitationQuery = permissionProcedure(['INVITE_USER']).query(() => true)

export default canCreateInvitationQuery
