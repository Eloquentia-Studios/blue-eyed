<script lang="ts">
  export let type: string
  export let label: string
  export let value: string

  const onInput = (e: any) => (value = e.target.value)
</script>

<div class="flex flex-col">
  <label class="text-sm font-semibold" for={label}>{label}</label>
  <input class="border-gray-800 border-solid border-[1px] rounded-sm pl-2 pr-2" {type} id={label} on:input={onInput} {value} />
</div>
