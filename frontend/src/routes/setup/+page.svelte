<script lang="ts">
  import Button from '../../components/Button.svelte'
  import CenteredFormWithLogo from '../../components/CenteredFormWithLogo.svelte'
  import HorizontalDivider from '../../components/HorizontalDivider.svelte'
  import Input from '../../components/Input.svelte'
  import trpc from '../../services/trpc'

  let errorMessage: string | undefined = undefined
  let invalidFields: { [key: string]: string } = {}
  let username = ''
  let email = ''
  let password = ''

  // I don't like this, but couldn't be arsed to write it in a better way
  const parseErrorMessage = (msg: string) => {
    let error: string | undefined = undefined
    let fields: { [key: string]: string } = {}
    try {
      const data = JSON.parse(msg)
      data.reverse().forEach((d: { path: string[]; message: string }) => (fields[d.path.join('.')] = d.message))
    } catch (err) {
      error = msg
    } finally {
      return { error, fields }
    }
  }

  const handleSubmit = () => {
    trpc.setupAdmin
      .mutate({ username, email, password })
      .then(() => (window.location.href = '/'))
      .catch((err) => {
        const { error, fields } = parseErrorMessage(err.message)
        errorMessage = error
        invalidFields = fields
      })
  }
</script>

<CenteredFormWithLogo>
  <h1 class="text-2xl font-bold">Admin account</h1>
  <p class="text-sm text-gray-400">Create your initial admin account</p>

  <HorizontalDivider />

  {#if errorMessage}<div class="text-red-500">{errorMessage}</div>{/if}

  <Input type="text" label="Username" bind:value={username} error={invalidFields['username']} />
  <Input type="email" label="Email" bind:value={email} error={invalidFields['email']} />
  <Input type="password" label="Password" bind:value={password} error={invalidFields['password']} />
  <Button className="mt-2" on:click={handleSubmit}>Complete Setup</Button>
</CenteredFormWithLogo>
