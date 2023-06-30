<script type="ts">
  import { onMount } from 'svelte'
  import trpc from '../../services/trpc'

  onMount(async () => {
    try {
      const [setupIncomplete, isAuthenticated] = await Promise.all([trpc.setupIncomplete.query(), trpc.isAuthenticated.query()])

      if (setupIncomplete) window.location.href = '/setup'
      if (!isAuthenticated) window.location.href = '/authorization'
    } catch (error) {
      console.error(error)
      window.location.href = '/500'
    }
  })
</script>

<slot />
