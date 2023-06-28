<script lang="ts">
  import Button from '../../components/Button.svelte'
  import Input from '../../components/Input.svelte'
  import trpc from '../../services/trpc'

  let username: string = ''
  let password: string = ''

  const submit = async () => {
    const token = await trpc.authorize.mutate({ username, password })
    console.log(token)
  }
</script>

<div class="flex flex-col items-center gap-2 p-4 bg-white rounded-md shadow-md">
  <h1 class="text-xl font-semibold text-primary">Blue Eyed</h1>

  <Input type="text" label="Username" bind:value={username} />
  <Input type="password" label="Password" bind:value={password} />
  <Button on:click={submit}>Sign in</Button>
</div>
