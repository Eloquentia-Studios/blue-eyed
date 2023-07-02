<script type="ts">
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

<div class="grid w-screen h-screen grid-cols-1 grid-rows-2">
  <div class="pb-[3.75rem] h-fit"><slot /></div>
  <!-- <Navigation className="fixed bottom-0 w-screen" /> -->
</div>
