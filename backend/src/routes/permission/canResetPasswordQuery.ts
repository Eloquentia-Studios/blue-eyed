import { permissionCheckQuery } from '../common/permissionCheckQuery'

const canDeletePasswordQuery = permissionCheckQuery('USERS_DELETE')

export default canDeletePasswordQuery
