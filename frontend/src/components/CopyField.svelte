<script lang="ts">
  import { onMount } from 'svelte'
  import Input from './Input.svelte'

  let input: HTMLInputElement
  export let value: string
  export let copyOnMount: boolean = false

  const selectAll = () => {
    input.select()
  }

  const copyContent = (content: string) => {
    navigator.clipboard.writeText(content).catch((err) => console.error('Failed to automatically copy content to clipboard.')) // TODO: Make this use a toast
  }

  onMount(() => {
    if (copyOnMount) copyContent(value)
  })
</script>

<Input on:focus={selectAll} on:click={selectAll} label="" {value} bind:inputElement={input} readonly noAutoComplete focused />
