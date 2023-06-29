<script lang="ts">
  import Button from '../../components/Button.svelte'
  import CenteredFormWithLogo from '../../components/CenteredFormWithLogo.svelte'
  import HorizontalDivider from '../../components/HorizontalDivider.svelte'
  import Input from '../../components/Input.svelte'
  import trpc from '../../services/trpc'

  let errorMessage: string | undefined = undefined
  let invalidFields: ('username' | 'email' | 'password')[] = []
  let username = ''
  let email = ''
  let password = ''

  const parseErrorMessage = (msg: string) => {
    const data = JSON.parse(msg)
    const fields = data.map((d: { path: string[]; message: string }) => ({ path: d.path[0], message: d.message }))
    console.log(JSON.parse(msg))
    console.log(fields)

    return {
      error: 'An error occurred',
      fields
    }
  }

  const handleSubmit = () => {
    trpc.setupAdmin
      .mutate({ username, email, password })
      .then(() => (window.location.href = '/'))
      .catch((err) => {
        const { error, fields } = parseErrorMessage(err.message)
        errorMessage = err.message
        invalidFields = fields
      })
  }
</script>

<CenteredFormWithLogo>
  <h1 class="text-2xl font-bold">Admin account</h1>
  <p class="text-sm text-gray-400">Create your initial admin account</p>

  <HorizontalDivider />

  {#if errorMessage}<div class="text-red-500">{errorMessage}</div>{/if}

  <Input type="text" label="Username" value="" />
  <Input type="email" label="Email" value="" />
  <Input type="password" label="Password" value="" />
  <Button className="mt-2" on:click={handleSubmit}>Complete Setup</Button>
</CenteredFormWithLogo>
