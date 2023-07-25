<script lang="ts">
  import { getAllRoles } from '../services/role'
  import ErrorMessage from './ErrorMessage.svelte'
  import Loader from './Loader.svelte'
  import RoleListItem from './RoleListItem.svelte'

  const roles = getAllRoles()
</script>

<div class="w-screen p-4 lg:w-2/3 2xl:w-1/2 lg:m-auto">
  <div class="flex flex-row items-center justify-between mb-2">
    <span class="text-2xl font-bold">Roles</span>
  </div>

  <div class="flex flex-col p-2 rounded-md bg-slate-900">
    {#if $roles.isLoading}
      <Loader />
    {:else if $roles.error}
      <ErrorMessage errorMessage="Could not load roles" />
    {:else}
      {#each $roles.data as role}
        <RoleListItem {role} />
      {/each}
    {/if}
  </div>
</div>
