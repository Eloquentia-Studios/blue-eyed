<script lang="ts">
  import ErrorMessage from '../../components/ErrorMessage.svelte'
  import IconTextButton from '../../components/IconTextButton.svelte'
  import Loader from '../../components/Loader.svelte'
  import UserListItem from '../../components/UserListItem.svelte'
  import trpc from '../../services/trpc'

  const client = trpc()
  const getUsers = client.getUsers.createQuery()
  const createUserInvitation = client.createUserInvitation.createMutation()

  const inviteUser = async () => {
    try {
      const invitationToken = await $createUserInvitation.mutateAsync()
      const url = `${window.location.origin}/register?invitationToken=${encodeURIComponent(invitationToken)}`
      window.prompt('Copy to clipboard: Ctrl+C, Enter', url)
    } catch {
      alert("Couldn't create invitation link")
    }
  }
</script>

<div class="w-screen p-4 lg:w-2/3 2xl:w-1/2 lg:m-auto">
  <div class="flex flex-row items-center justify-between mb-2">
    <span class="text-2xl font-bold">Users</span>
    <IconTextButton on:click={inviteUser} icon="ic:round-plus" iconClass="w-6 h-6" title="Add User" />
  </div>

  <div class="flex flex-col p-2 rounded-md bg-slate-900">
    {#if $getUsers.isLoading}
      <Loader />
    {:else if $getUsers.error}
      <ErrorMessage errorMessage="Could not load users" />
    {:else}
      {#each $getUsers.data as user}
        <UserListItem {user} />
      {/each}
    {/if}
  </div>
</div>
