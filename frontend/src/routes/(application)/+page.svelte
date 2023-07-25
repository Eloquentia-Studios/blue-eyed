<script lang="ts">
  import RoleList from '../../components/RoleList.svelte'
  import UserList from '../../components/UserList.svelte'
  import { canReadRoles } from '../../services/permission'

  const canReadRolesQuery = canReadRoles()
</script>

<UserList />

{#if $canReadRolesQuery.data}
  <RoleList />
{/if}
