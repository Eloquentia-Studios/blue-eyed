<script lang="ts">
  import parseTRPCError from '$lib/parseTRPCError'
  import { canChangeUserRoles } from '../services/permission'
  import { getUserRoles, setUserRoleStatus } from '../services/role'
  import type { RouterOutput } from '../services/trpc'
  import Loader from './Loader.svelte'
  import Switch from './Switch.svelte'

  export let user: RouterOutput['getUsers'][number]
  export let role: RouterOutput['getAllRoles'][number]

  let errorMessage: string | undefined = undefined

  const setUserRole = setUserRoleStatus()

  const canChangeRoles = canChangeUserRoles()
  const userRoles = getUserRoles(user.id)

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

<div class="flex flex-row items-center justify-between">
  <span class="text-lg">{role.name}</span>

  {#if $userRoles.data}
    <Switch on:change={({ detail }) => updateUserRole(role.id, detail.checked)} label="{user.id}-{role.id}" checked={$userRoles.data.some((a) => a.id === role.id)} disabled={!$canChangeRoles.data || $setUserRole.isLoading} />
  {/if}

  {#if $userRoles.isLoading}
    <Loader class="m-0 w-6 h-6" />
  {/if}

  {#if $userRoles.error}
    <p class="text-red-500">{$userRoles.error.message}</p>
  {/if}

  {#if errorMessage}
    <p class="text-red-500">{errorMessage}</p>
  {/if}
</div>
