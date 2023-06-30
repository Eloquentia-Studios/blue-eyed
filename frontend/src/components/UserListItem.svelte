<script lang="ts">
  import type { RouterOutput } from '../services/trpc'
  import IconButton from './IconButton.svelte'
  import IconTextButton from './IconTextButton.svelte'
  import MenuButton from './MenuButton.svelte'
  import PopoutMenu from './PopoutMenu.svelte'

  let isMenuOpen = false
  const toggleMenu = () => (isMenuOpen = !isMenuOpen)

  export let user: RouterOutput['getUsers'][number]
</script>

<div class="relative flex items-center justify-between p-2 pb-3 pt-3 after:absolute after:left-[5%] after:w-[90%] after:h-[1px] after:bottom-0 after:bg-gray-800 after:block last:after:hidden">
  <div class="flex flex-col sm:flex-row sm:gap-3">
    <span class="font-bold sm:font-semibold">{user.username}</span>
    <span class="text-sm text-gray-500 sm:text-base">{user.email}</span>
  </div>

  <div class="flex-row hidden gap-2 sm:flex">
    <IconTextButton icon="mdi:lock-reset" title="Reset password" />
    <IconTextButton class="bg-red-600" icon="bi:trash-fill" title="Remove" />
  </div>

  <div class="relative sm:hidden">
    <IconButton on:click={toggleMenu} icon="bi:three-dots" iconClass="w-5 h-5" />

    {#if isMenuOpen}
      <PopoutMenu on:clickoutside={toggleMenu}>
        <MenuButton icon="mdi:lock-reset" title="Reset password" />
        <MenuButton class="bg-red-600" icon="bi:trash-fill" title="Remove" />
      </PopoutMenu>
    {/if}
  </div>
</div>
