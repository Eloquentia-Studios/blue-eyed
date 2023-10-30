<script lang="ts">
    import {page} from '$app/stores'
    import Button from '../../components/Button.svelte'
    import CenteredContainerForm from '../../components/CenteredContainerForm.svelte'
    import CenteredContainerWithLogo from '../../components/CenteredContainerWithLogo.svelte'
    import ErrorMessage from '../../components/ErrorMessage.svelte'
    import Input from '../../components/Input.svelte'
    import Loader from '../../components/Loader.svelte'
    import parseTRPCError from '../../lib/parseTRPCError'
    import {authorizeUser, getCurrentUser, getRedirectToken} from '../../services/user'
    import type {ApiError} from "../../../../backend/bindings/ApiError";

    const redirect = $page.url.searchParams.get('redirect')

    const redirectToken = getRedirectToken()
    const authorize = authorizeUser()
    const currentUser = getCurrentUser()
    let alreadyRunRedirect = false

    $: if ($currentUser.error) window.location.href = '/500'
    $: if ($currentUser.data) doRedirect() // Executed multiple times if redirectToken is directly in the reactive statement. This is a workaround.

    const doRedirect = () => {
        $redirectToken
            .mutateAsync()
            .then(({redirectToken}) => {
                if (redirect) window.location.href = `${redirect}/auth.blue-eyed/callback?redirectToken=${redirectToken}&redirect=${encodeURIComponent(redirect)}`
                else window.location.href = '/'
            })
            .catch((err) => {
                const {error} = parseTRPCError(err.message)
                console.error(error)
                window.location.href = '/500'
            })
    }

    let username: string = ''
    let password: string = ''
    let errorMessage: string | undefined = undefined
    let fieldErrors: { [key: string]: string } = {}

    const submit = async () => {
        $authorize
            .mutateAsync({username, password})
            .then(() => {
                if (redirect) window.location.href = `${redirect}/auth.blue-eyed/callback?redirectToken=${redirectToken}&redirect=${encodeURIComponent(redirect)}`
                else window.location.href = '/'
            })
            .catch((err) => {
                const {message, fields} = err as ApiError
                errorMessage = fields ? undefined : message
                fieldErrors = fields || {}
            })
    }
</script>

<CenteredContainerWithLogo>
  {#if $currentUser.isLoading || $redirectToken.isLoading}
    <Loader class="w-12 h-12 sm:w-20 sm:h-20 md:w-24 md:h-24"/>
  {:else}
    <CenteredContainerForm on:submit={submit}>
      <ErrorMessage {errorMessage}/>
      <Input type="text" label="Username" bind:value={username} error={fieldErrors["username"]}/>
      <Input type="password" label="Password" bind:value={password} error={fieldErrors["password"]}/>
      <Button type="submit" class="mt-2">Sign in</Button>
    </CenteredContainerForm>
  {/if}
</CenteredContainerWithLogo>
