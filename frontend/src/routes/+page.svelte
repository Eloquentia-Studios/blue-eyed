<script lang="ts">
  import { onMount } from 'svelte'
  import trpc from '../services/trpc'

  onMount(() => {
    trpc.hello.query('123').then((res) => {
      console.log(res)
    })
  })
</script>

<h1>Hello world!</h1>
