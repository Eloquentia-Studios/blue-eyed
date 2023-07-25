<script lang="ts">
  import parseTRPCError from '$lib/parseTRPCError'
  import { canWriteRoles } from '../services/permission'
  import { createRole, getAllRoles } from '../services/role'
  import Button from './Button.svelte'
  import ErrorMessage from './ErrorMessage.svelte'
  import IconTextButton from './IconTextButton.svelte'
  import Input from './Input.svelte'
  import Loader from './Loader.svelte'
  import Modal from './Modal.svelte'
  import RoleListItem from './RoleListItem.svelte'

  const roles = getAllRoles()
  const canWriteRolesQuery = canWriteRoles()
  const createRoleMutation = createRole()

  let roleCreationOpen = false
  let newRoleName = ''
  let errorMessage: string | undefined = undefined
  let invalidFields: { [key: string]: string } = {}
  const openRoleCreation = () => (roleCreationOpen = true)
  const createNewRole = async () => {
    try {
      await $createRoleMutation.mutateAsync({ name: newRoleName })

      newRoleName = ''
      roleCreationOpen = false
    } catch (err: any) {
      const { error, fields } = parseTRPCError(err.message)
      errorMessage = error
      invalidFields = fields
    }
  }
</script>

<div class="w-screen p-4 lg:w-2/3 2xl:w-1/2 lg:m-auto">
  <div class="flex flex-row items-center justify-between mb-2">
    <span class="text-2xl font-bold">Roles</span>

    {#if $canWriteRolesQuery.data}
      <IconTextButton on:click={openRoleCreation} icon="ic:round-plus" iconClass="w-6 h-6" title="Add Role" />
      <Modal bind:open={roleCreationOpen}>
        <div class="flex flex-col gap-2">
          <h4 class="text-lg font-bold">New Role</h4>

          <ErrorMessage {errorMessage} />

          <Input label="Role name" bind:value={newRoleName} error={invalidFields['name']} />
          <Button type="submit" on:click={createNewRole}>Create Role</Button>
        </div>
      </Modal>
    {/if}
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
