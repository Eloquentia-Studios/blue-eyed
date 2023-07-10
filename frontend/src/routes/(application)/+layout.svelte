<script type="ts">
  import Loader from '../../components/Loader.svelte'
  import trpc from '../../services/trpc'
  import { getCurrentUser } from '../../services/user'

  const client = trpc()
  const setupIncomplete = client.setupIncomplete.createQuery()
  const currentUser = getCurrentUser()

  const navigateOnStart = () => {
    if ($setupIncomplete.error || $currentUser.error) return (window.location.href = '/authorization')
    if ($setupIncomplete.data) return (window.location.href = '/setup')
    if (!$currentUser.data) return (window.location.href = '/authorization')
  }

  $: if (!$setupIncomplete.isLoading && !$currentUser.isLoading) navigateOnStart()
</script>

{#if $setupIncomplete.isLoading || $currentUser.isLoading}
  <div class="flex items-center justify-center w-screen h-screen">
    <Loader class="w-1/2 h-1/2" />
  </div>
{:else}
  <slot />
{/if}
