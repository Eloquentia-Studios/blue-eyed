import { permissionCheckQuery } from '../common/permissionCheckQuery'

const canDeleteUserQuery = permissionCheckQuery('USERS_DELETE')

export default canDeleteUserQuery
