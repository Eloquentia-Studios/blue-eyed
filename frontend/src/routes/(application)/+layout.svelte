<script type="ts">
  import Loader from '../../components/Loader.svelte'
  import { getCurrentUser } from '../../services/user'
  import Setup from "../../services/setup";

  const setupComplete = Setup.setupCompleteQuery()
  const currentUser = getCurrentUser()

  const navigateOnStart = () => {
    if ($setupComplete.error || $currentUser.error) return (window.location.href = '/authorization')
    if (!$setupComplete.data) return (window.location.href = '/setup')
    if (!$currentUser.data) return (window.location.href = '/authorization')
  }

  $: if (!$setupComplete.isLoading && !$currentUser.isLoading) navigateOnStart()
</script>

{#if $setupComplete.isLoading || $currentUser.isLoading}
  <div class="flex items-center justify-center w-screen h-screen">
    <Loader class="w-1/2 h-1/2" />
  </div>
{:else}
  <slot />
{/if}
