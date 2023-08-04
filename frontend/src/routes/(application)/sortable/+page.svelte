<script lang="ts">
  import VerticalSortableList from '../../../components/SortableList/VerticalSortableList.svelte'
  import type SortEvent from '../../../types/SortableList/SortEvent'

  let items = Array.from({ length: 10 }, (_, i) => `Item ${i}`)
  const onFinalize = (event: SortEvent<string>) => {
    console.log(event.detail)
    const { items: newItems } = event.detail
    items = newItems
  }
</script>

<main class="flex items-center justify-around w-screen h-screen">
  <div class="p-4 bg-orange-900 rounded-lg">
    {@html JSON.stringify(items, null, 2).replaceAll('\n', '<br>').replaceAll(' ', '&nbsp;')}
  </div>

  <div class="flex flex-col p-4 bg-orange-900 rounded-lg gap-2">
    {#each items as item (item)}
      <div class="p-2 bg-gray-800 rounded-lg select-none w-24 h-12 flex items-center justify-around">{item}</div>
    {/each}
  </div>

  <div class="p-2 bg-gray-900 rounded-lg">
    <VerticalSortableList {items} class="flex flex-col max-w-md gap-2 p-2" on:finalize={onFinalize}>
      {#each items as item (item)}
        <div class="p-2 bg-gray-800 rounded-lg select-none w-24 h-12 flex items-center justify-around">{item}</div>
      {/each}
    </VerticalSortableList>
  </div>
</main>
