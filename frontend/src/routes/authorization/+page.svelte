<script lang="ts">
  import { onMount } from 'svelte'
  import Button from '../../components/Button.svelte'
  import CenteredFormWithLogo from '../../components/CenteredFormWithLogo.svelte'
  import ErrorMessage from '../../components/ErrorMessage.svelte'
  import Input from '../../components/Input.svelte'
  import parseTRPCError from '../../lib/parseTRPCError'
  import trpc from '../../services/trpc'

  onMount(async () => {
    const isAuthenticated = await trpc.isAuthenticated.query()
    if (isAuthenticated) {
      trpc.getRedirectToken
        .mutate()
        .then(({ redirectToken }) => {
          const redirect = new URLSearchParams(window.location.search).get('redirect')
          if (redirect) window.location.href = `${redirect}/auth.blue-eyed/callback?redirectToken=${redirectToken}&redirect=${encodeURIComponent(redirect)}`
          else window.location.href = '/'
        })
        .catch((err) => {
          const { error } = parseTRPCError(err.message)
          console.error(error)
          window.location.href = '/500'
        })
    }
  })

  let username: string = ''
  let password: string = ''
  let errorMessage: string | undefined = undefined

  const submit = async () => {
    const redirect = new URLSearchParams(window.location.search).get('redirect')

    await trpc.authorize
      .mutate({ username, password })
      .then(({ redirectToken }) => {
        if (redirect) window.location.href = `${redirect}/auth.blue-eyed/callback?redirectToken=${redirectToken}&redirect=${encodeURIComponent(redirect)}`
        else window.location.href = '/'
      })
      .catch((err) => {
        const { error } = parseTRPCError(err.message)
        errorMessage = error
      })
  }
</script>

<CenteredFormWithLogo>
  <ErrorMessage {errorMessage} />
  <Input type="text" label="Username" bind:value={username} />
  <Input type="password" label="Password" bind:value={password} />
  <Button className="mt-2" on:click={submit}>Sign in</Button>
</CenteredFormWithLogo>
