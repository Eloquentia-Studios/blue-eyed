import { permissionCheckQuery } from '../common/permissionCheckQuery'

const canReadRolesRoute = permissionCheckQuery('ROLES_READ')

export default canReadRolesRoute
