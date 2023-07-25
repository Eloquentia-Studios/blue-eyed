<script lang="ts">
  import { slide } from 'svelte/transition'
  import { getAllPermissions } from '../services/permission'
  import type { RouterOutput } from '../services/trpc'
  import DrawerButton from './DrawerButton.svelte'
  import RolePermissionSwitch from './RolePermissionSwitch.svelte'

  const allPermissions = getAllPermissions()

  export let role: RouterOutput['getAllRoles'][number]

  let open: boolean = false
</script>

<div class="relative p-2 pt-3 pb-3 after:absolute after:left-[5%] after:w-[90%] after:h-[1px] after:bottom-0 after:bg-gray-800 after:block last:after:hidden">
  <div class="flex items-center justify-between">
    <div class="flex flex-col sm:flex-row sm:gap-3">
      <span class="font-bold sm:font-semibold">{role.name}</span>
      <span class="text-sm text-gray-500 sm:text-base">{role.description ? role.description : ''}</span>
    </div>
    <DrawerButton bind:open />
  </div>

  {#if open && $allPermissions.data}
    <div transition:slide class="grid grid-cols-1 gap-4 p-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {#each $allPermissions.data as permission (permission)}
        <RolePermissionSwitch {role} {permission} />
      {/each}
    </div>
  {/if}
</div>
