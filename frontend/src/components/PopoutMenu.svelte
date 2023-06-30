<script lang="ts">
  import { clickoutside } from '@svelte-put/clickoutside'
</script>

<div use:clickoutside={{ event: 'mousedown' }} on:clickoutside class="absolute top-0 right-0 z-10 overflow-hidden rounded bg-primary-700 w-max"><slot /></div>
