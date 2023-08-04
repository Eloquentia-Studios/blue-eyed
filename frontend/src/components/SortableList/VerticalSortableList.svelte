<script lang="ts">
  import findDropElementPosition from '$lib/findDropElementPosition'
  import { onDestroy, onMount } from 'svelte'

  export let items: any[]

  let container: HTMLDivElement
  let children: HTMLElement[] = []
  let dragging: HTMLElement | undefined
  let draggingInitialY: number | undefined
  let draggingDeltaY: number | undefined
  let empty: HTMLDivElement | undefined
  let lastInbetween: HTMLElement | undefined

  const updateDragPosition = () => {
    if (!dragging) return
    let y = draggingInitialY! + draggingDeltaY!
    if (y < 0) y = 0
    if (y > container.offsetHeight - dragging.offsetHeight) y = container.offsetHeight - dragging.offsetHeight

    dragging.style.position = 'absolute'
    dragging.style.top = `${y}px`
    dragging.style.cursor = 'grabbing'
  }

  const insertEmpty = (child: HTMLElement, relative: 'BEFORE' | 'AFTER', instant = false) => {
    console.log('inserting empty')
    if (!dragging) return
    empty = document.createElement('div')
    empty.style.height = `${dragging.offsetHeight}px`
    empty.style.width = `${dragging.offsetWidth}px`

    if (relative === 'BEFORE') child.before(empty)
    child.after(empty)
  }

  const removeEmpty = (replace?: HTMLElement) => {
    if (!empty) return
    const oldEmpty = empty
    empty = undefined

    if (replace) oldEmpty.after(replace)
    oldEmpty.remove()
  }

  const setListInitialAttributes = () => {
    container.style.position = 'relative'
  }

  const setChildInitialAttributes = (child: HTMLElement) => {
    child.style.position = ''
    child.style.top = ''
    child.style.cursor = 'grab'
    child.setAttribute('data-sortable-id', `${children.indexOf(child)}`)
  }

  const childMouseDownHandler = (child: HTMLElement) => {
    dragging = child
    draggingInitialY = child.offsetTop
    draggingDeltaY = 0
    insertEmpty(child, 'BEFORE', true)
    updateDragPosition()
  }

  const initializeSortableList = () => {
    setListInitialAttributes()
    children.push(...Array.from(container.children as HTMLCollectionOf<HTMLElement>))
    children.forEach(setChildInitialAttributes)
    children.forEach((child) => child.addEventListener('mousedown', () => childMouseDownHandler(child)))
  }

  const handleMouseMoveEmptyInsert = () => {
    if (!dragging) return

    const inbetween = findDropElementPosition(container, dragging, children)
    if (inbetween) {
      if (inbetween !== lastInbetween) {
        removeEmpty()
        if (inbetween === container.lastElementChild) insertEmpty(inbetween, 'AFTER')
        else insertEmpty(inbetween, 'BEFORE')
      }
    } else removeEmpty()
    lastInbetween = inbetween
  }

  const bodyMouseMoveHandler = (event: MouseEvent | { movementY: number }) => {
    if (!dragging) return
    draggingDeltaY! += event.movementY
    updateDragPosition()
    handleMouseMoveEmptyInsert()
  }

  const placeDraggedElement = () => {
    if (!dragging) return
    removeEmpty(dragging)
  }

  const bodyMouseUpHandler = () => {
    if (!dragging) return
    placeDraggedElement()
    children.forEach(setChildInitialAttributes)

    dragging = undefined
    draggingInitialY = undefined
    draggingDeltaY = undefined
    lastInbetween = undefined
  }

  const clearEventListeners = () => {
    children.forEach((child) => child.removeEventListener('mousedown', () => childMouseDownHandler(child)))
    document.body.removeEventListener('mousemove', bodyMouseMoveHandler)
    document.body.removeEventListener('mouseup', bodyMouseUpHandler)
  }

  onMount(initializeSortableList)
  onDestroy(clearEventListeners)

  document.body.addEventListener('mousemove', bodyMouseMoveHandler)
  document.body.addEventListener('mouseup', bodyMouseUpHandler)
</script>

<div bind:this={container} class={$$props.class}><slot /></div>
