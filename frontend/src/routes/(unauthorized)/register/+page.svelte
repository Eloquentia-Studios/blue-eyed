<script lang="ts">
  import { page } from '$app/stores'
  import parseTRPCError from '$lib/parseTRPCError'
  import { onMount } from 'svelte'
  import Button from '../../../components/Button.svelte'
  import ErrorMessage from '../../../components/ErrorMessage.svelte'
  import HorizontalDivider from '../../../components/HorizontalDivider.svelte'
  import Input from '../../../components/Input.svelte'
  import trpc from '../../../services/trpc'

  const invitationToken = $page.url.searchParams.get('invitationToken')

  const registerUser = trpc().registerUser.createMutation()

  let errorMessage: string | undefined = undefined
  let invalidFields: { [key: string]: string } = {}
  let username: string = ''
  let email: string = ''
  let password: string = ''

  onMount(async () => {
    if (!invitationToken) window.location.href = '/'
  })

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

<h1 class="text-2xl font-bold">Registration</h1>
<p class="text-sm text-gray-400">Create your new Blue Eyed account</p>

<HorizontalDivider />

<ErrorMessage {errorMessage} />

<Input type="text" label="Username" bind:value={username} error={invalidFields['username']} />
<Input type="email" label="Email" bind:value={email} error={invalidFields['email']} />
<Input type="password" label="Password" bind:value={password} error={invalidFields['password']} />
<Button on:click={handleSubmit} className="mt-2">Create Account</Button>
