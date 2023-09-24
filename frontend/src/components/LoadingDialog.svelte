<script lang="ts">
  import Loader from './Loader.svelte'
  import Modal from './Modal.svelte'

  export let open: boolean
  export let title: string
</script>

<Modal bind:open hideCloseButton>
  <Loader class="w-12 h-12" />
  <p class="font-semibold">{title}</p>
</Modal>
