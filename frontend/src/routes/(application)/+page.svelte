<script lang="ts">
  import ErrorMessage from '../../components/ErrorMessage.svelte'
  import IconTextButton from '../../components/IconTextButton.svelte'
  import Loader from '../../components/Loader.svelte'
  import UserListItem from '../../components/UserListItem.svelte'
  import trpc from '../../services/trpc'

  let users = trpc.getUsers.query()

  const inviteUser = async () => {
    const invitationToken = await trpc.createUserInvitation.mutate()
    const url = `${window.location.origin}/register?invitationToken=${encodeURIComponent(invitationToken)}`
    window.prompt('Copy to clipboard: Ctrl+C, Enter', url)
  }
</script>

<div class="w-screen p-4 lg:w-2/3 2xl:w-1/2 lg:m-auto">
  <div class="flex flex-row items-center justify-between mb-2">
    <span class="text-2xl font-bold">Users</span>
    <IconTextButton on:click={inviteUser} icon="ic:round-plus" iconClass="w-6 h-6" title="Add User" />
  </div>

  <div class="flex flex-col p-2 rounded-md bg-slate-900">
    {#await users}
      <Loader class="w-20 h-20" />
    {:then users}
      {#each users as user}
        <UserListItem {user} />
      {/each}
    {:catch error}
      <ErrorMessage errorMessage="Could not load users" />
    {/await}
  </div>
</div>
