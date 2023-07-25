import { permissionCheckQuery } from '../common/permissionCheckQuery'

const canWriteRolesRoute = permissionCheckQuery('ROLES_WRITE')

export default canWriteRolesRoute
