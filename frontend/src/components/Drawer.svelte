<script lang="ts">
  import { fade, slide } from 'svelte/transition'

  export let open: boolean

  const close = () => (open = false)
</script>

{#if open}
  <div transition:slide class="fixed bottom-0 left-0 right-0 p-4 overflow-y-auto max-h-[80%] bg-slate-900 rounded-t-lg z-20">
    <slot />
  </div>

  <div transition:fade class="fixed inset-0 bg-black opacity-40 z-10" on:click={close} />
{/if}
