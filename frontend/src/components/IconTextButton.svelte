<script lang="ts">
  import Icon from '@iconify/svelte'

  export let icon: string
  export let iconClass: string = ''
  export let title: string
</script>

<button class="{$$props.class} flex flex-row items-center justify-center h-8 gap-1 p-2 text-2xl rounded group w-fit bg-primary-700 hover:brightness-125 fill-gray-200 hover:fill-gray-200" {title}>
  <Icon class="{iconClass} w-4 h-4" {icon} />
  <span class="hidden text-sm md:block">{title}</span>
</button>
