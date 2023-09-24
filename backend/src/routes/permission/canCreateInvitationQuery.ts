import { permissionCheckQuery } from '../common/permissionCheckQuery'

const canCreateInvitationQuery = permissionCheckQuery('USERS_INVITE')

export default canCreateInvitationQuery
