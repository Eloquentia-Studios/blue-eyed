<script lang="ts">
  import { page } from '$app/stores'
  import parseTRPCError from '$lib/parseTRPCError'
  import Button from '../../../components/Button.svelte'
  import CenteredContainerForm from '../../../components/CenteredContainerForm.svelte'
  import ErrorMessage from '../../../components/ErrorMessage.svelte'
  import HorizontalDivider from '../../../components/HorizontalDivider.svelte'
  import Input from '../../../components/Input.svelte'
  import { createUser } from '../../../services/user'

  const invitationToken = $page.url.searchParams.get('invitationToken')
  if (!invitationToken) window.location.href = '/'

  const registerUser = createUser()

  let errorMessage: string | undefined = undefined
  let invalidFields: { [key: string]: string } = {}
  let username: string = ''
  let email: string = ''
  let password: string = ''

  const handleSubmit = async () => {
    if (!invitationToken) return (errorMessage = 'Invalid invitation token')
    $registerUser
      .mutateAsync({ invitationToken, registrationInfo: { username, email, password } })
      .then(() => (window.location.href = '/authorization'))
      .catch((err) => {
        const { error, fields } = parseTRPCError(err.message)
        errorMessage = error
        invalidFields = fields
      })
  }
</script>

<CenteredContainerForm on:submit={handleSubmit}>
  <h1 class="text-2xl font-bold">Registration</h1>
  <p class="text-sm text-gray-400">Create your new Blue Eyed account</p>

  <HorizontalDivider />

  <ErrorMessage {errorMessage} />

  <Input type="text" label="Username" bind:value={username} error={invalidFields['registrationInfo.username']} />
  <Input type="email" label="Email" bind:value={email} error={invalidFields['registrationInfo.email']} />
  <Input type="password" label="Password" bind:value={password} error={invalidFields['registrationInfo.password']} />
  <Button type="submit" class="mt-2">Create Account</Button>
</CenteredContainerForm>
