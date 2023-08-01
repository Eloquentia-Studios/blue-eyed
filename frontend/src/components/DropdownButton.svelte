<script lang="ts">
  import Icon from '@iconify/svelte'

  export let open = false

  const toggle = () => (open = !open)
</script>

<button class="w-4 h-4 cursor-pointer hover:brightness-75 {$$props.class}" on:click={toggle}>
  <Icon icon="ooui:expand" class="w-full h-full transition-transform {open ? 'rotate-180' : ''} " />
</button>
