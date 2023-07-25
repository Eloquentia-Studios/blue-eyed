<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { ChangeEventHandler } from 'svelte/elements'

  export let checked: boolean = false
  export let label: string

  const dispatch = createEventDispatcher<{ change: { checked: boolean } }>()

  const onChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    if (!e.target) return
    dispatch('change', {
      checked: e.currentTarget.checked
    })
  }
</script>

<label for="{label}-switch" class="flex items-center cursor-pointer">
  <div class="relative">
    <input on:change={onChange} id="{label}-switch" type="checkbox" class="sr-only" bind:checked />
    <div class="block w-12 h-6 transition-colors duration-200 ease-in-out bg-gray-600 rounded-full" class:bg-primary-600={checked} />
    <div class="absolute w-4 h-4 transition-transform transform bg-white rounded-full left-1 top-1" class:translate-x-6={checked} />
  </div>
</label>
