<script lang="ts">
  import { page } from '$app/stores'
  import Button from '../../components/Button.svelte'
  import CenteredFormWithLogo from '../../components/CenteredFormWithLogo.svelte'
  import ErrorMessage from '../../components/ErrorMessage.svelte'
  import Input from '../../components/Input.svelte'
  import Loader from '../../components/Loader.svelte'
  import parseTRPCError from '../../lib/parseTRPCError'
  import trpc from '../../services/trpc'

  const redirect = $page.url.searchParams.get('redirect')

  const client = trpc()
  const isAuthenticated = client.isAuthenticated.createQuery()
  const getRedirectToken = client.getRedirectToken.createMutation()
  const authorize = client.authorize.createMutation()

  $: if ($isAuthenticated.error) window.location.href = '/500'
  $: if ($isAuthenticated.data) {
    $getRedirectToken
      .mutateAsync()
      .then(({ redirectToken }) => {
        if (redirect) window.location.href = `${redirect}/auth.blue-eyed/callback?redirectToken=${redirectToken}&redirect=${encodeURIComponent(redirect)}`
        else window.location.href = '/'
      })
      .catch((err) => {
        const { error } = parseTRPCError(err.message)
        console.error(error)
        window.location.href = '/500'
      })
  }

  let username: string = ''
  let password: string = ''
  let errorMessage: string | undefined = undefined

  const submit = async () => {
    $authorize
      .mutateAsync({ username, password })
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

<CenteredFormWithLogo on:submit={submit}>
  {#if $isAuthenticated.isLoading || $getRedirectToken.isLoading}
    <Loader class="w-12 h-12 sm:w-20 sm:h-20 md:w-24 md:h-24" />
  {:else}
    <ErrorMessage {errorMessage} />
    <Input type="text" label="Username" bind:value={username} />
    <Input type="password" label="Password" bind:value={password} />
    <Button type="submit" class="mt-2">Sign in</Button>
  {/if}
</CenteredFormWithLogo>
