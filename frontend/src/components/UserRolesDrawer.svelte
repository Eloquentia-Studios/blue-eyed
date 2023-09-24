<script lang="ts">
  import { getAllRoles } from '../services/role'
  import type { RouterOutput } from '../services/trpc'
  import Drawer from './Drawer.svelte'
  import Loader from './Loader.svelte'
  import UserRoleSwitch from './UserRoleSwitch.svelte'

  export let open: boolean
  export let user: RouterOutput['getUsers'][number]

  let errorMessage: string | undefined = undefined

  const roles = getAllRoles()
</script>

<Drawer bind:open>
  <h4 class="text-lg font-bold mb-2">Roles for {user.displayName}</h4>

  {#if $roles.data}
    <div class="flex flex-col gap-2">
      {#each $roles.data as role}
        {#if role.name !== 'User'}
          <UserRoleSwitch {user} {role} />
        {/if}
      {/each}
    </div>
  {/if}

  {#if $roles.error}
    <p class="text-red-500">{$roles.error.message}</p>
  {/if}

  {#if errorMessage}
    <p class="text-red-500">{errorMessage}</p>
  {/if}

  {#if $roles.isLoading}
    <Loader class="w-16 h-16" />
  {/if}
</Drawer>
