<script lang="ts">
  import { onMount } from 'svelte'
  import trpc from '../../../services/trpc'

  onMount(async () => {
    try {
      const isAuthenticated = await trpc.isAuthenticated.query()

      if (isAuthenticated) window.location.href = '/'
    } catch (error) {
      console.error(error)
      window.location.href = '/500'
    }
  })
</script>

<slot />
