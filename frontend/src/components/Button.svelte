<script lang="ts">
  export let type: HTMLButtonElement['type'] = 'button'
</script>

<button on:click {type} class="bg-primary hover:opacity-90 text-white font-semibold py-2 px-4 rounded-md transition-all {$$props.class}">
  <slot />
</button>
