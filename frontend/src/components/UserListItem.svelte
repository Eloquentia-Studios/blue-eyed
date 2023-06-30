<script lang="ts">
  import IconButton from './IconButton.svelte'
  import MenuButton from './MenuButton.svelte'
  import PopoutMenu from './PopoutMenu.svelte'

  let isMenuOpen = false
  const toggleMenu = () => (isMenuOpen = !isMenuOpen)
</script>

<div class="relative flex items-center justify-between p-2 pb-3 pt-3 after:absolute after:left-[5%] after:w-[90%] after:h-[1px] after:bottom-0 after:bg-gray-800 after:block last:after:hidden">
  <div class="flex flex-col">
    <span class="font-bold">SuperGamer1337</span>
    <span class="text-sm text-gray-500">felix.b.aronsson@gmail.com</span>
  </div>

  <div class="relative">
    <IconButton on:click={toggleMenu} icon="bi:three-dots" iconClass="w-5 h-5" />

    {#if isMenuOpen}
      <PopoutMenu on:clickoutside={toggleMenu}>
        <MenuButton icon="mdi:lock-reset" title="Reset password" />
        <MenuButton class="bg-red-600" icon="bi:trash-fill" title="Remove" />
      </PopoutMenu>
    {/if}
  </div>
</div>
