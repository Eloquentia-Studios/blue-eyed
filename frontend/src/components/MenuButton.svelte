<script lang="ts">
  import Icon from '@iconify/svelte'

  export let icon: string
  export let title: string
  export let disabled = false
</script>

<button on:click class="flex flex-row items-center w-full h-10 gap-2 p-2 font-semibold border-b border-b-primary-900 last:border-b-0 disabled:brightness-50 {$$props.class}" {disabled}>
  <Icon class="w-5 h-5" {icon} />
  {title}
</button>
