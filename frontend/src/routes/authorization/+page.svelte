<script lang="ts">
  import Button from '../../components/Button.svelte'
  import Input from '../../components/Input.svelte'

  let value: string = ''
</script>

<div class="flex flex-col items-center p-4 bg-white rounded-md shadow-md gap-2">
  <h1 class="text-xl font-semibold text-primary">Blue Eyed</h1>

  <Input type="text" label="Username" bind:value />
  <Input type="password" label="Password" bind:value />
  <Button>Sign in</Button>
</div>
