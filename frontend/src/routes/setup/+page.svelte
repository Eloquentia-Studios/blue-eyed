<script lang="ts">
  import FullScreenCenter from '../../components/FullScreenCenter.svelte'
  import Input from '../../components/Input.svelte'
</script>

<FullScreenCenter>
  <div class="flex flex-col gap-2 p-4 rounded-md bg-slate-900">
    <Input type="text" label="Username" value="" />
    <Input type="email" label="Email" value="" />
    <Input type="password" label="Password" value="" />
  </div>
</FullScreenCenter>
