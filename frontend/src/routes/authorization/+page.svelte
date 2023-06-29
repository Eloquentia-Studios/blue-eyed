<script lang="ts">
  import Button from '../../components/Button.svelte'
  import CenteredFormWithLogo from '../../components/CenteredFormWithLogo.svelte'
  import Input from '../../components/Input.svelte'
  import parseTRPCError from '../../lib/parseTRPCError'
  import trpc from '../../services/trpc'

  let username: string = ''
  let password: string = ''
  let errorMessage: string | undefined = undefined

  const submit = async () => {
    const redirect = new URLSearchParams(window.location.search).get('redirect')
    if (!redirect) throw new Error('No redirect URL provided')

    await trpc.authorize
      .mutate({ username, password })
      .then(({ redirectToken }) => (window.location.href = `${redirect}/auth.blue-eyed/callback?redirectToken=${redirectToken}&redirect=${encodeURIComponent(redirect)}`))
      .catch((err) => {
        const { error } = parseTRPCError(err.message)
        errorMessage = error
      })
  }
</script>

<CenteredFormWithLogo>
  {#if errorMessage}<div class="text-red-500">{errorMessage}</div>{/if}
  <Input type="text" label="Username" bind:value={username} />
  <Input type="password" label="Password" bind:value={password} />
  <Button className="mt-2" on:click={submit}>Sign in</Button>
</CenteredFormWithLogo>
