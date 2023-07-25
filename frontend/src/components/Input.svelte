<script lang="ts">
  import { onMount } from 'svelte'

  export let type: 'text' | 'password' | 'email' = 'text'
  export let label: string = ''
  export let error: string | undefined = undefined
  export let value: string
  export let readonly: boolean = false
  export let focused: boolean = false
  export let noAutoComplete: boolean = false
  export let disabled: boolean = false

  export let inputElement: HTMLInputElement | null = null

  const onInput = (e: any) => (value = e.target.value)

  onMount(() => {
    if (!inputElement) return console.error('Input element not found')
    if (focused) inputElement.focus()
  })
</script>

<div class="flex flex-col gap-1">
  <label class="text-sm text-gray-400" for={label}>
    {label}
  </label>

  <input
    class="px-4 py-2 text-gray-400 transition-all border border-gray-700 rounded-md bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
    class:border-red-500={error ? true : false}
    class:brightness-50={disabled}
    id={label}
    {type}
    {value}
    {readonly}
    {disabled}
    on:input={onInput}
    on:focus
    bind:this={inputElement}
    autocomplete={noAutoComplete ? 'off' : 'on'}
  />

  {#if error}
    <div class="text-sm text-red-500">{error}</div>
  {/if}
</div>
