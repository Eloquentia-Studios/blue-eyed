<script lang="ts">
  import Icon from '@iconify/svelte'

  export let icon: string
  export let iconClass: string = ''
</script>

<button on:click class="flex items-center justify-center w-8 h-8 text-2xl rounded bg-primary-700 hover:bg-primary fill-gray-200 hover:fill-gray-200 {$$props.class}">
  <Icon class={iconClass} {icon} />
</button>
