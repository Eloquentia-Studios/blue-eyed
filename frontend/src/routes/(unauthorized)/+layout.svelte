<script lang="ts">
  import CenteredFormWithLogo from '../../components/CenteredFormWithLogo.svelte'
  import trpc from '../../services/trpc'

  const client = trpc()
  const isAuthenticated = client.isAuthenticated.createQuery()

  $: if ($isAuthenticated.error) window.location.href = '/500'

  $: if (!$isAuthenticated.isLoading && $isAuthenticated.data) window.location.href = '/'
</script>

<CenteredFormWithLogo><slot /></CenteredFormWithLogo>
