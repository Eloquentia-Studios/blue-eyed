<script lang="ts">
  import { onMount } from 'svelte'
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
    <button class="flex items-center justify-center w-8 h-8 text-2xl rounded bg-primary-700 hover:bg-primary fill-gray-200 hover:fill-gray-200">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M18 12.998h-5v5a1 1 0 0 1-2 0v-5H6a1 1 0 0 1 0-2h5v-5a1 1 0 0 1 2 0v5h5a1 1 0 0 1 0 2z" /></svg>
    </button>
  </div>

  <div class="flex flex-col p-2 rounded-md bg-slate-900 md:w-96">
    <UserListItem />
    <UserListItem />
    <UserListItem />
  </div>
</div>
