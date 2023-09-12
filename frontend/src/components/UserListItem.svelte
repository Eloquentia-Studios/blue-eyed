<script lang="ts">
  import { canDeleteUser, canResetPassword } from '../services/permission'
  import type { RouterOutput } from '../services/trpc'
  import { deleteUser, getCurrentUser, requestPasswordReset } from '../services/user'
  import ConfirmDialog from './ConfirmDialog.svelte'
  import CopyField from './CopyField.svelte'
  import IconButton from './IconButton.svelte'
  import IconTextButton from './IconTextButton.svelte'
  import MenuButton from './MenuButton.svelte'
  import Modal from './Modal.svelte'
  import PopoutMenu from './PopoutMenu.svelte'
  import UserRolesDrawer from './UserRolesDrawer.svelte'

  export let user: RouterOutput['getUsers'][number]

  const deleteUserMutation = deleteUser()
  const requestPasswordResetMutation = requestPasswordReset()
  const currentUser = getCurrentUser()
  const canDeleteUserQuery = canDeleteUser(user.id)
  const canResetPasswordQuery = canResetPassword()

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

  let rolesOpen = false
  const openRoles = () => {
    isMenuOpen = false
    rolesOpen = true
  }

  let cannotDeleteUser = false
  $: cannotDeleteUser = $canDeleteUserQuery.isError || $currentUser.isLoading || $currentUser.data?.id === user.id

  let hideDelete = true
  $: hideDelete = $canDeleteUserQuery.isLoading || $canDeleteUserQuery.isError || !$canDeleteUserQuery.data

  let hideReset = true
  $: hideReset = $canResetPasswordQuery.isLoading || $canResetPasswordQuery.isError || !$canResetPasswordQuery.data
</script>

<ConfirmDialog confirm={doDeleteUser} title="Are you sure you want to delete {user.displayName}?" bind:open={deleteOpen} destructive />

<Modal bind:open={resetPasswordOpen}>
  <h4 class="text-lg font-bold">Reset link for {user.displayName}</h4>
  <p class="text-sm text-gray-400">The link is automatically copied to your clipboard.</p>
  <CopyField value={resetLink} copyOnMount />
</Modal>

<UserRolesDrawer bind:open={rolesOpen} {user} />

<div class="relative flex items-center justify-between p-2 pb-3 pt-3 after:absolute after:left-[5%] after:w-[90%] after:h-[1px] after:bottom-0 after:bg-gray-800 after:block last:after:hidden">
  <div class="flex flex-col sm:flex-row sm:gap-3">
    <span class="font-bold sm:font-semibold">{user.displayName}</span>
    <span class="text-sm text-gray-500 sm:text-base">{user.email}</span>
  </div>

  {#if !hideReset || !hideDelete}
    <div class="flex-row hidden gap-2 sm:flex">
      {#if !hideReset}
        <IconTextButton on:click={resetPassword} icon="mdi:lock-reset" title="Reset password" />
      {/if}

      <IconTextButton on:click={openRoles} icon="mdi:shield-lock-open-outline" title="Roles" />

      {#if !hideDelete}
        <IconTextButton on:click={openDelete} class="bg-red-600" icon="bi:trash-fill" title="Remove" disabled={cannotDeleteUser} />
      {/if}
    </div>

    <div class="relative sm:hidden">
      <IconButton on:click={toggleMenu} icon="bi:three-dots" iconClass="w-5 h-5" />

      {#if isMenuOpen}
        <PopoutMenu on:clickoutside={toggleMenu}>
          {#if !hideReset}
            <MenuButton on:click={resetPassword} icon="mdi:lock-reset" title="Reset password" />
          {/if}

          <MenuButton on:click={openRoles} icon="mdi:shield-lock-open-outline" title="Roles" />

          {#if !hideDelete}
            <MenuButton on:click={openDelete} class="bg-red-600" icon="bi:trash-fill" title="Remove" disabled={cannotDeleteUser} />
          {/if}
        </PopoutMenu>
      {/if}
    </div>
  {/if}
</div>
