<script lang="ts">
  import Icon from '@iconify/svelte'
  import { clickoutside } from '@svelte-put/clickoutside'

  let isMenuOpen = false
  let containerNode: HTMLDivElement

  const toggleMenu = () => (isMenuOpen = !isMenuOpen)
</script>

<div class="relative flex items-center justify-between p-2 pb-3 pt-3 after:absolute after:left-[5%] after:w-[90%] after:h-[1px] after:bottom-0 after:bg-gray-800 after:block last:after:hidden">
  <div class="flex flex-col">
    <span class="font-bold">SuperGamer1337</span>
    <span class="text-sm text-gray-500">felix.b.aronsson@gmail.com</span>
  </div>
  <div class="relative" bind:this={containerNode}>
    <button on:click={toggleMenu} class="flex items-center justify-center w-8 h-8 rounded bg-primary-700 fill-gray-200 hover:bg-primary hover:fill-gray-200">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" class="fill-inherit">
        <circle cy="12" cx="6" r="2" />
        <circle cy="12" cx="12" r="2" />
        <circle cy="12" cx="18" r="2" />
      </svg>
    </button>

    {#if isMenuOpen}
      <div use:clickoutside={{ event: 'mousedown' }} on:clickoutside={toggleMenu} class="absolute top-0 right-0 z-10 overflow-hidden rounded bg-primary-700 w-max">
        <button class="flex flex-row items-center w-full h-10 gap-2 p-2 font-semibold border-b border-b-primary-900 last:border-b-0">
          <Icon class="w-5 h-5" icon="mdi:lock-reset" /> Reset password
        </button>
        <button class="flex flex-row items-center w-full h-10 gap-2 p-2 font-semibold bg-red-600 border-b border-b-primary-900 last:border-b-0">
          <Icon class="w-5 h-5" icon="bi:trash-fill" /> Remove
        </button>
      </div>
    {/if}
  </div>
</div>
