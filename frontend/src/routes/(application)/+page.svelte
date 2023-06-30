<script lang="ts">
  import { onMount } from 'svelte'
  import CenteredFormWithLogo from '../../components/CenteredFormWithLogo.svelte'
  import trpc from '../../services/trpc'

  onMount(async () => {
    const setupIncomplete = await trpc.setupIncomplete.query()
    if (setupIncomplete) window.location.href = '/setup'
  })
</script>

<CenteredFormWithLogo>
  <p>Welcome! (This is a placeholder)</p>
</CenteredFormWithLogo>
