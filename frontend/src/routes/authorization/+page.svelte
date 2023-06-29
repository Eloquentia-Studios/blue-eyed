<script lang="ts">
  import Button from '../../components/Button.svelte'
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

<div class="flex flex-col items-center gap-2 p-4 bg-white rounded-md shadow-md">
  <h1 class="text-xl font-semibold text-primary">Blue Eyed</h1>

  <Input type="text" label="Username" bind:value={username} />
  <Input type="password" label="Password" bind:value={password} />
  <Button on:click={submit}>Sign in</Button>
</div>
