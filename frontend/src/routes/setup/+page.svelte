<script lang="ts">
  import Button from '../../components/Button.svelte'
  import FullScreenCenter from '../../components/FullScreenCenter.svelte'
  import HorizontalDivider from '../../components/HorizontalDivider.svelte'
  import Input from '../../components/Input.svelte'
</script>

<FullScreenCenter>
  <div class="flex flex-col items-center gap-8 -mt-8 lg:gap-20 lg:-mt-20">
    <img src="/logo.svg" class="h-14 -mt-14 md:h-24 md:-mt-24 lg:h-32 lg:-mt-32" alt="Logo" />
    <div class="flex flex-col gap-2 p-4 rounded-md bg-slate-900 md:w-96">
      <h1 class="text-2xl font-bold">Admin account</h1>
      <p class="text-sm text-gray-400">Create your initial admin account</p>

      <HorizontalDivider />

      <Input type="text" label="Username" value="" />
      <Input type="email" label="Email" value="" />
      <Input type="password" label="Password" value="" />
      <Button className="mt-2">Complete Setup</Button>
    </div>
  </div>
</FullScreenCenter>
