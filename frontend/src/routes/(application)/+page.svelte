<script lang="ts">
  import { onMount } from 'svelte'
  import IconButton from '../../components/IconButton.svelte'
  import UserListItem from '../../components/UserListItem.svelte'
  import trpc from '../../services/trpc'

  onMount(async () => {
    const setupIncomplete = await trpc.setupIncomplete.query()
    if (setupIncomplete) window.location.href = '/setup'
  })
</script>

<div class="w-screen p-4">
  <div class="flex flex-row justify-between mb-2 align-middle">
    <span class="text-2xl font-bold">Users</span>
    <IconButton icon="ic:round-plus" />
  </div>

  <div class="flex flex-col p-2 rounded-md bg-slate-900 md:w-96">
    <UserListItem />
    <UserListItem />
    <UserListItem />
  </div>
</div>
