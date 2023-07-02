<script type="ts">
  import Loader from '../../components/Loader.svelte'
  import trpc from '../../services/trpc'

  const client = trpc()
  const setupIncomplete = client.setupIncomplete.createQuery()
  const isAuthenticated = client.isAuthenticated.createQuery()

  const navigateOnStart = () => {
    if ($setupIncomplete.error || $isAuthenticated.error) return (window.location.href = '/authorization')
    if ($setupIncomplete.data) return (window.location.href = '/setup')
    if (!$isAuthenticated.data) return (window.location.href = '/authorization')
  }

  $: if (!$setupIncomplete.isLoading && !$isAuthenticated.isLoading) navigateOnStart()
</script>

{#if $setupIncomplete.isLoading || $isAuthenticated.isLoading}
  <div class="flex items-center justify-center w-screen h-screen">
    <Loader class="w-1/2 h-1/2" />
  </div>
{:else}
  <slot />
{/if}
