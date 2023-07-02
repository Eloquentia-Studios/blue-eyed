<script lang="ts">
  import CenteredFormWithLogo from '../../components/CenteredFormWithLogo.svelte'
  import Loader from '../../components/Loader.svelte'
  import trpc from '../../services/trpc'

  const client = trpc()
  const isAuthenticated = client.isAuthenticated.createQuery()

  $: if ($isAuthenticated.error) window.location.href = '/500'

  $: if (!$isAuthenticated.isLoading && $isAuthenticated.data) window.location.href = '/'
</script>

<CenteredFormWithLogo>
  {#if $isAuthenticated.isLoading}
    <Loader class="w-12 h-12 sm:w-20 sm:h-20 md:w-24 md:h-24" />
  {:else}
    <slot />
  {/if}
</CenteredFormWithLogo>
