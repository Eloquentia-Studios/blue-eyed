import { permissionCheckQuery } from '../common/permissionCheckQuery'

const canDeletePasswordQuery = permissionCheckQuery('USERS_WRITE')

export default canDeletePasswordQuery
