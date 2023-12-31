<script lang="ts">
  import parseTRPCError from '$lib/parseTRPCError'
  import Icon from '@iconify/svelte'
  import { canDeleteUserRole } from '../services/permission'
  import { deleteRole } from '../services/role'
  import Toast from '../services/toast'
  import type { RouterOutput } from '../services/trpc'
  import ConfirmDialog from './ConfirmDialog.svelte'
  import Loader from './Loader.svelte'
  import LoadingDialog from './LoadingDialog.svelte'

  const deleteRoleMutation = deleteRole()

  export let role: RouterOutput['getAllRoles'][number]

  const deleteRoleDisabled = canDeleteUserRole(role.id)

  let deleteOpen = false
  const openDelete = () => (deleteOpen = true)

  const deleteRoleEvent = () => {
    $deleteRoleMutation.mutateAsync({ targetedRoleId: role.id }).catch((e) => {
      const { error } = parseTRPCError(e.message)
      if (error) return Toast.error(error)

      console.error(error)
      Toast.error('An error occurred while deleting the role.')
    })
  }
</script>

<LoadingDialog title="Deleting role..." bind:open={$deleteRoleMutation.isLoading} />
<ConfirmDialog confirm={deleteRoleEvent} title="Are you sure you want to delete {role.name}?" bind:open={deleteOpen} destructive />

{#if !$deleteRoleDisabled.isLoading && $deleteRoleDisabled.data !== undefined}
  <button class="cursor-pointer text-zinc-400 hover:text-red-600 disabled:text-zinc-700 disabled:cursor-not-allowed" on:click={openDelete} disabled={!$deleteRoleDisabled.data}>
    <Icon icon="bi:trash-fill" class="w-4 h-4 text-inherit" />
  </button>
{:else}
  <Loader />
{/if}
