<script lang="ts">
  export let type: string
  export let label: string
  export let value: string

  const onInput = (e: any) => (value = e.target.value)
</script>

<div class="flex flex-col gap-1">
  <label class="text-sm text-gray-400" for={label}>
    {label}
  </label>
  <input class="px-4 py-2 rounded-md bg-slate-800 text-gray-400 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" {type} id={label} {value} on:input={onInput} />
</div>
