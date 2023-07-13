<script lang="ts">
  import type { RouterOutput } from '../services/trpc'
  import { deleteUser, getCurrentUser, requestPasswordReset } from '../services/user'
  import ConfirmDialog from './ConfirmDialog.svelte'
  import CopyField from './CopyField.svelte'
  import IconButton from './IconButton.svelte'
  import IconTextButton from './IconTextButton.svelte'
  import MenuButton from './MenuButton.svelte'
  import Modal from './Modal.svelte'
  import PopoutMenu from './PopoutMenu.svelte'

  const deleteUserMutation = deleteUser()
  const requestPasswordResetMutation = requestPasswordReset()
  const currentUser = getCurrentUser()

  export let user: RouterOutput['getUsers'][number]

  let isMenuOpen = false
  const toggleMenu = () => (isMenuOpen = !isMenuOpen)

  let resetPasswordOpen = false
  let resetLink = ''
  const resetPassword = async () => {
    const resetToken = await $requestPasswordResetMutation.mutateAsync(user.id)
    resetLink = `${window.location.origin}/reset?resetToken=${encodeURIComponent(resetToken)}`
    resetPasswordOpen = true
  }

  let deleteOpen = false
  const openDelete = () => (deleteOpen = true)
  const doDeleteUser = async () => $deleteUserMutation.mutate(user.id)

  let cannotDeleteUser = false
  $: cannotDeleteUser = $currentUser.isLoading || $currentUser.isError || $currentUser.data?.id === user.id
</script>

<ConfirmDialog confirm={doDeleteUser} title="Are you sure you want to delete {user.displayName}?" bind:open={deleteOpen} destructive />

<Modal bind:open={resetPasswordOpen}>
  <h4 class="text-lg font-bold">Reset link for {user.displayName}</h4>
  <p class="text-sm text-gray-400">The link is automatically copied to your clipboard.</p>
  <CopyField value={resetLink} copyOnMount />
</Modal>

<div class="relative flex items-center justify-between p-2 pb-3 pt-3 after:absolute after:left-[5%] after:w-[90%] after:h-[1px] after:bottom-0 after:bg-gray-800 after:block last:after:hidden">
  <div class="flex flex-col sm:flex-row sm:gap-3">
    <span class="font-bold sm:font-semibold">{user.displayName}</span>
    <span class="text-sm text-gray-500 sm:text-base">{user.email}</span>
  </div>

  <div class="flex-row hidden gap-2 sm:flex">
    <IconTextButton on:click={resetPassword} icon="mdi:lock-reset" title="Reset password" />
    <IconTextButton on:click={openDelete} class="bg-red-600" icon="bi:trash-fill" title="Remove" disabled={cannotDeleteUser} />
  </div>

  <div class="relative sm:hidden">
    <IconButton on:click={toggleMenu} icon="bi:three-dots" iconClass="w-5 h-5" />

    {#if isMenuOpen}
      <PopoutMenu on:clickoutside={toggleMenu}>
        <MenuButton on:click={resetPassword} icon="mdi:lock-reset" title="Reset password" />
        <MenuButton on:click={openDelete} class="bg-red-600" icon="bi:trash-fill" title="Remove" disabled={cannotDeleteUser} />
      </PopoutMenu>
    {/if}
  </div>
</div>
