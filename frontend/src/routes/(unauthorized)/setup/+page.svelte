<script lang="ts">
  import Button from '../../../components/Button.svelte'
  import CenteredContainerForm from '../../../components/CenteredContainerForm.svelte'
  import ErrorMessage from '../../../components/ErrorMessage.svelte'
  import HorizontalDivider from '../../../components/HorizontalDivider.svelte'
  import Input from '../../../components/Input.svelte'
  import parseTRPCError from '../../../lib/parseTRPCError'
  import { setupAdminUser } from '../../../services/setup'

  const createAdmin = setupAdminUser()

  let errorMessage: string | undefined = undefined
  let invalidFields: { [key: string]: string } = {}
  let username = ''
  let email = ''
  let password = ''

  const handleSubmit = () => {
    $createAdmin
      .mutateAsync({ username, email, password })
      .then(() => (window.location.href = '/'))
      .catch((err) => {
        const { error, fields } = parseTRPCError(err.message)
        errorMessage = error
        invalidFields = fields
      })
  }
</script>

<CenteredContainerForm on:submit={handleSubmit}>
  <h1 class="text-2xl font-bold">Admin account</h1>
  <p class="text-sm text-gray-400">Create your initial admin account</p>

  <HorizontalDivider />

  <ErrorMessage {errorMessage} />

  <Input type="text" label="Username" bind:value={username} error={invalidFields['username']} />
  <Input type="email" label="Email" bind:value={email} error={invalidFields['email']} />
  <Input type="password" label="Password" bind:value={password} error={invalidFields['password']} />
  <Button class="mt-2" on:click={handleSubmit}>Complete Setup</Button>
</CenteredContainerForm>
