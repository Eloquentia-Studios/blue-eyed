<script lang="ts">
  export let errorMessage: string | undefined
</script>

{#if errorMessage}
  <div class="p-2 bg-red-500 rounded-md">{errorMessage}</div>
{/if}
