<script lang="ts">
  export let type: string
  export let label: string
  export let value: string
  export let error: string | undefined = undefined

  const onInput = (e: any) => (value = e.target.value)
</script>

<div class="flex flex-col gap-1">
  <label class="text-sm text-gray-400" for={label}>
    {label}
  </label>
  <input
    class="px-4 py-2 text-gray-400 transition-all border border-gray-700 rounded-md bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
    class:border-red-500={error ? true : false}
    {type}
    id={label}
    {value}
    on:input={onInput}
  />
  {#if error}
    <div class="text-sm text-red-500">{error}</div>
  {/if}
</div>
