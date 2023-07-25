<script lang="ts">
  import { changeRolePermission } from '../services/permission'
  import type { RouterOutput } from '../services/trpc'
  import Switch from './Switch.svelte'

  const updateRolePermission = changeRolePermission()

  export let permission: RouterOutput['getAllPermissions'][number]
  export let role: RouterOutput['getAllRoles'][number]

  const handleChange = (enabled: boolean) => {
    $updateRolePermission.mutateAsync({
      enabled,
      roleId: role.id,
      permission: permission
    })
  }
</script>

<div class="flex flex-row items-center gap-2 pl-4 lg:pl-0 lg:m-auto">
  <span class="text-sm text-white sm:text-base">{permission}</span>
  <Switch on:change={({ detail }) => handleChange(detail.checked)} label="{role.id}-{permission}" checked={role.permissions.includes(permission)} disabled={$updateRolePermission.isLoading} />
</div>
