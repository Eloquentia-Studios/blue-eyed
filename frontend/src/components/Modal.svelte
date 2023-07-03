<script lang="ts">
  import Icon from '@iconify/svelte'
  import { clickoutside } from '@svelte-put/clickoutside'

  let dialog: HTMLDialogElement

  export let open: boolean

  const close = () => {
    open = false
  }

  const escapeCloses = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close()
  }

  $: if (dialog && open) {
    dialog.showModal()
  } else if (dialog) {
    dialog.close()
  }
</script>

<dialog class="text-white rounded-md bg-slate-900 backdrop:open:opacity-40 backdrop:bg-black" bind:this={dialog}>
  <!-- This is a workaround so that onMount in child components act predictably
       with the modal being shown. -->
  {#if dialog && open}
    <div id="modal-content" class="relative" use:clickoutside={{ event: 'mousedown' }} on:clickoutside={close}>
      <button class="absolute cursor-pointer -right-2 -top-2 hover:brightness-75" on:keypress={escapeCloses} on:click={close}>
        <Icon icon="ic:round-close" class="w-5 h-5 " />
      </button>
      <slot />
    </div>
  {/if}
</dialog>
