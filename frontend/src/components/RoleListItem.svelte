<script lang="ts">
  import Icon from '@iconify/svelte'
  import { slide } from 'svelte/transition'
  import { getAllPermissions } from '../services/permission'
  import { moveRoleBefore } from '../services/role'
  import type { RouterOutput } from '../services/trpc'
  import DropdownButton from './DropdownButton.svelte'
  import RoleListItemDelete from './RoleListItemDelete.svelte'
  import RolePermissionSwitch from './RolePermissionSwitch.svelte'

  const allPermissions = getAllPermissions()
  const moveRoleBeforeMutation = moveRoleBefore()

  export let role: RouterOutput['getAllRoles'][number]
  export let index: number
  export let numberOfRoles: number
  export let nextRoleId: string | undefined
  export let previousRoleId: string | undefined

  const moveRole = (before: boolean) => {
    if (before && previousRoleId) {
      $moveRoleBeforeMutation.mutateAsync({ roleToMove: role.id, roleIdToMoveBefore: previousRoleId })
    } else if (nextRoleId) {
      $moveRoleBeforeMutation.mutateAsync({ roleToMove: nextRoleId, roleIdToMoveBefore: role.id })
    }
  }

  let open: boolean = false
</script>

<div class="relative group p-2 pt-3 pb-3 after:absolute after:left-[5%] after:w-[90%] after:h-[1px] after:bottom-0 after:bg-gray-800 after:block last:after:hidden">
  <div class="flex items-center justify-between">
    <div class="flex flex-col sm:flex-row sm:gap-3">
      <span class="font-bold sm:font-semibold">{role.name}</span>
      <span class="text-sm text-gray-500 sm:text-base">{role.description ? role.description : ''}</span>
    </div>
    <div class="flex flex-row items-center gap-4">
      <RoleListItemDelete {role} />
      <DropdownButton bind:open />
      {#if role.name !== 'SuperAdmin' && role.name !== 'User'}
        <div class="relative w-4 h-4">
          {#if index !== 1}
            <button class="absolute -top-1.5" on:click={() => moveRole(true)}>
              <Icon icon="ooui:expand" class="w-4 h-4 rotate-180 cursor-pointer hover:brightness-50" />
            </button>
          {/if}
          {#if index !== numberOfRoles - 2}
            <button class="absolute -bottom-1.5" on:click={() => moveRole(false)}>
              <Icon icon="ooui:expand" class="w-4 h-4 cursor-pointer hover:brightness-50" />
            </button>
          {/if}
        </div>
      {:else}
        <div class="w-4 h-full" />
      {/if}
    </div>
  </div>

  {#if open && $allPermissions.data}
    <div transition:slide class="grid grid-cols-1 gap-4 p-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {#each $allPermissions.data as permission}
        <RolePermissionSwitch {role} {permission} />
      {/each}
    </div>
  {/if}
</div>
