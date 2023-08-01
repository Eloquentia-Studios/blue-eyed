import { permissionCheckQuery } from '../common/permissionCheckQuery'

const canChangeUserRolesRoute = permissionCheckQuery(['USERS_WRITE', 'ROLES_WRITE'])

export default canChangeUserRolesRoute
