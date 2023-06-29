<script lang="ts">
  import Button from '../../components/Button.svelte'
  import FullScreenCenter from '../../components/FullScreenCenter.svelte'
  import HorizontalDivider from '../../components/HorizontalDivider.svelte'
  import Input from '../../components/Input.svelte'
  import CenteredFormWithLogo from '../../components/CenteredFormWithLogo.svelte'
</script>

<CenteredFormWithLogo>
      <h1 class="text-2xl font-bold">Admin account</h1>
      <p class="text-sm text-gray-400">Create your initial admin account</p>

      <HorizontalDivider />

      <Input type="text" label="Username" value="" />
      <Input type="email" label="Email" value="" />
      <Input type="password" label="Password" value="" />
      <Button className="mt-2">Complete Setup</Button>
</CenteredFormWithLogo>