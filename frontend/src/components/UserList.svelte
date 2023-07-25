<script lang="ts">
  import { createUserInvitation } from '../services/invitation'
  import { canCreateInvitation } from '../services/permission'
  import { getUsers } from '../services/user'
  import CopyField from './CopyField.svelte'
  import ErrorMessage from './ErrorMessage.svelte'
  import IconTextButton from './IconTextButton.svelte'
  import Loader from './Loader.svelte'
  import Modal from './Modal.svelte'
  import UserListItem from './UserListItem.svelte'

  const users = getUsers()
  const canInviteUser = canCreateInvitation()
  const createUserInvitationMutation = createUserInvitation()

  let inviteLink = ''
  let invitationOpen = false

  const inviteUser = async () => {
    const invitationToken = await $createUserInvitationMutation.mutateAsync()
    inviteLink = `${window.location.origin}/register?invitationToken=${encodeURIComponent(invitationToken)}`
    invitationOpen = true
  }
</script>

<div class="w-screen p-4 lg:w-2/3 2xl:w-1/2 lg:m-auto">
  <div class="flex flex-row items-center justify-between mb-2">
    <span class="text-2xl font-bold">Users</span>

    {#if $canInviteUser.data}
      <IconTextButton on:click={inviteUser} icon="ic:round-plus" iconClass="w-6 h-6" title="Add User" />
      <Modal bind:open={invitationOpen}>
        <h4 class="text-lg font-bold">Invitation Link</h4>
        <p class="text-sm text-gray-400">The link is automatically copied to your clipboard.</p>
        <CopyField value={inviteLink} copyOnMount />
      </Modal>
    {/if}
  </div>

  <div class="flex flex-col p-2 rounded-md bg-slate-900">
    {#if $users.isLoading}
      <Loader />
    {:else if $users.error}
      <ErrorMessage errorMessage="Could not load users" />
    {:else}
      {#each $users.data as user}
        <UserListItem {user} />
      {/each}
    {/if}
  </div>
</div>
