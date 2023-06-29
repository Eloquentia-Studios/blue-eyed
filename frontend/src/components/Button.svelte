<script lang="ts">
  export let className: string = ''
</script>

<button on:click class="bg-primary hover:opacity-90 text-white font-semibold py-2 px-4 rounded-md transition-all {className}"> <slot /></button>
