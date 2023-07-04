<script lang="ts">
  import FullScreenCenter from './FullScreenCenter.svelte'
</script>

<FullScreenCenter>
  <div class="flex flex-col items-center gap-8 -mt-8 lg:gap-20 lg:-mt-20">
    <img src="/logo.svg" class="h-14 -mt-14 md:h-24 md:-mt-24 lg:h-32 lg:-mt-32" alt="Logo" />
    <form on:submit|preventDefault class="flex flex-col gap-2 p-4 rounded-md bg-slate-900 md:w-96">
      <slot />
    </form>
  </div>
</FullScreenCenter>
