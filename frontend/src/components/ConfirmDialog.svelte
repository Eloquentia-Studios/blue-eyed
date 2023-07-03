<script lang="ts">
  import Button from './Button.svelte'
  import Modal from './Modal.svelte'

  export let open: boolean
  export let title: string
  export let confirm: () => void
  export let destructive = false

  const handleConfirm = () => {
    confirm()
    open = false
  }
</script>

<Modal bind:open hideCloseButton>
  <p class="text-lg font-semibold">{title}</p>
  <div class="flex items-center justify-center w-full gap-2 mt-4">
    <Button on:click={handleConfirm} class={destructive ? 'bg-red-600' : ''}>Yes</Button>
    <Button on:click={() => (open = false)}>No</Button>
  </div>
</Modal>
