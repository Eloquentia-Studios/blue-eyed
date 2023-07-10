<script lang="ts">
  import CenteredFormWithLogo from '../../components/CenteredContainerWithLogo.svelte'
  import Loader from '../../components/Loader.svelte'
  import { getCurrentUser } from '../../services/user'

  const currentUser = getCurrentUser()

  $: if ($currentUser.error) window.location.href = '/500'

  $: if (!$currentUser.isLoading && $currentUser.data) window.location.href = '/'
</script>

<CenteredFormWithLogo>
  {#if $currentUser.isLoading}
    <Loader class="w-12 h-12 sm:w-20 sm:h-20 md:w-24 md:h-24" />
  {:else}
    <slot />
  {/if}
</CenteredFormWithLogo>
