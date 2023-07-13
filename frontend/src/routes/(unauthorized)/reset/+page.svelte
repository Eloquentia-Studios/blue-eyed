<script lang="ts">
  import { page } from '$app/stores'
  import parseTRPCError from '$lib/parseTRPCError'
  import Button from '../../../components/Button.svelte'
  import CenteredContainerForm from '../../../components/CenteredContainerForm.svelte'
  import ErrorMessage from '../../../components/ErrorMessage.svelte'
  import HorizontalDivider from '../../../components/HorizontalDivider.svelte'
  import Input from '../../../components/Input.svelte'
  import { resetPassword } from '../../../services/user'

  let resetToken = $page.url.searchParams.get('resetToken')
  if (!resetToken) window.location.href = '/'

  const resetUserPassword = resetPassword()

  let errorMessage: string | undefined = undefined
  let invalidFields: { [key: string]: string } = {}
  let password: string = ''
  let confirmPassword: string = ''

  const handleSubmit = async () => {
    if (!resetToken) return (errorMessage = 'Invalid reset token')
    if (password !== confirmPassword) return (errorMessage = 'Passwords do not match')

    $resetUserPassword
      .mutateAsync({ resetToken, password })
      .then(() => (window.location.href = '/authorization'))
      .catch((err) => {
        const { error, fields } = parseTRPCError(err.message)
        errorMessage = error
        invalidFields = fields
      })
  }
</script>

<CenteredContainerForm on:submit={handleSubmit}>
  <h1 class="text-2xl font-bold">Reset password</h1>
  <p class="text-sm text-gray-400">Choose a new password</p>

  <HorizontalDivider />

  <ErrorMessage {errorMessage} />

  <Input type="password" label="Password" bind:value={password} error={invalidFields['password']} />
  <Input type="password" label="Confirm Password" bind:value={confirmPassword} error={invalidFields['confirmPassword']} />
  <Button type="submit" class="mt-2">Reset Password</Button>
</CenteredContainerForm>
