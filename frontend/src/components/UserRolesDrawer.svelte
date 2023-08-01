<script lang="ts">
  import parseTRPCError from '$lib/parseTRPCError'
  import { canChangeUserRoles } from '../services/permission'
  import { getAllRoles, getUserRoles, setUserRoleStatus } from '../services/role'
  import type { RouterOutput } from '../services/trpc'
  import Drawer from './Drawer.svelte'
  import Loader from './Loader.svelte'
  import Switch from './Switch.svelte'

  export let open: boolean
  export let user: RouterOutput['getUsers'][number]

  let errorMessage: string | undefined = undefined

  const setUserRole = setUserRoleStatus()

  const roles = getAllRoles()
  const userRoles = getUserRoles(user.id)
  const canChangeRoles = canChangeUserRoles()

  const updateUserRole = async (roleId: string, enabled: boolean) => {
    $setUserRole
      .mutateAsync({
        userId: user.id,
        roleId,
        enabled
      })
      .catch((error) => {
        errorMessage = parseTRPCError(error.message).error
      })
  }
</script>

<Drawer bind:open>
  <h4 class="text-lg font-bold mb-2">Roles for {user.displayName}</h4>

  {#if $roles.data && $userRoles.data && $canChangeRoles.data}
    <div class="flex flex-col gap-2">
      {#each $roles.data as role}
        <div class="flex flex-row items-center justify-between">
          <span class="text-lg">{role.name}</span>
          <Switch on:change={({ detail }) => updateUserRole(role.id, detail.checked)} label="{user.id}-{role.id}" checked={$userRoles.data.some((a) => a.id === role.id)} disabled={!$canChangeRoles.data || $setUserRole.isLoading} />
        </div>
      {/each}
    </div>
  {/if}

  {#if $roles.error}
    <p class="text-red-500">{$roles.error.message}</p>
  {/if}

  {#if $userRoles.error}
    <p class="text-red-500">{$userRoles.error.message}</p>
  {/if}

  {#if $canChangeRoles.error}
    <p class="text-red-500">{$canChangeRoles.error.message}</p>
  {/if}

  {#if errorMessage}
    <p class="text-red-500">{errorMessage}</p>
  {/if}

  {#if $roles.isLoading || $userRoles.isLoading || $canChangeRoles.isLoading}
    <Loader class="w-16 h-16" />
  {/if}
</Drawer>
