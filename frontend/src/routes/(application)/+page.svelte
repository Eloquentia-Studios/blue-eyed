<script lang="ts">
  import { onMount } from 'svelte'
  import IconTextButton from '../../components/IconTextButton.svelte'
  import UserListItem from '../../components/UserListItem.svelte'
  import trpc from '../../services/trpc'

  onMount(async () => {
    const setupIncomplete = await trpc.setupIncomplete.query()
    if (setupIncomplete) window.location.href = '/setup'
  })
</script>

<div class="w-screen p-4 lg:w-xl">
  <div class="flex flex-row items-center justify-between mb-2">
    <span class="text-2xl font-bold">Users</span>
    <IconTextButton icon="ic:round-plus" iconClass="w-6 h-6" title="Add User" />
  </div>

  <div class="flex flex-col p-2 rounded-md bg-slate-900">
    <UserListItem />
    <UserListItem />
    <UserListItem />
  </div>
</div>
