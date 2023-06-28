<script lang="ts">
  import trpc from '../services/trpc'

  const res = trpc.hello.query('world')
</script>

{#await res}
  <p>Loading...</p>
{:then greeting}
  <h1 class="text-red-600 font-bold">{greeting}</h1>
{/await}
