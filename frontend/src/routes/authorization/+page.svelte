<script lang="ts">
  import Button from '../../components/Button.svelte'
  import CenteredFormWithLogo from '../../components/CenteredFormWithLogo.svelte'
  import Input from '../../components/Input.svelte'
  import trpc from '../../services/trpc'

  let username: string = ''
  let password: string = ''

  const submit = async () => {
    const redirect = new URLSearchParams(window.location.search).get('redirect')
    if (!redirect) throw new Error('No redirect URL provided')

    const { redirectToken } = await trpc.authorize.mutate({ username, password })
    window.location.href = `${redirect}/auth.blue-eyed/callback?redirectToken=${redirectToken}&redirect=${encodeURIComponent(redirect)}`
  }
</script>

<CenteredFormWithLogo>
  <Input type="text" label="Username" bind:value={username} />
  <Input type="password" label="Password" bind:value={password} />
  <Button className="mt-2" on:click={submit}>Sign in</Button>
</CenteredFormWithLogo>
