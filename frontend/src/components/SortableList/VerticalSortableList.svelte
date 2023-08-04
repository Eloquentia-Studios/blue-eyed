<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { Action } from 'svelte/action'
  import type SortData from '../../types/SortableList/SortData.d'

  console.log('VerticalSortableList init')

  export let items: any[]

  const dispatch = createEventDispatcher<{ finalize: SortData<any> }>()

  const findDropElementPosition = (container: HTMLElement, target: HTMLElement, elements: HTMLElement[], extremeMargins = 5) => {
    const { top: containerTop, height: containerHeight } = container.getBoundingClientRect()
    const { top: targetTop, height: targetHeight } = target.getBoundingClientRect()

    const relativeTargetTop = targetTop - containerTop
    const relativeTargetBottom = relativeTargetTop + targetHeight

    if (relativeTargetTop < extremeMargins) return elements[0]
    if (relativeTargetBottom > containerHeight - extremeMargins) return elements[elements.length - 1]

    const inbetween = elements.find((element) => {
      const { top: elementTop, height: elementHeight } = element.getBoundingClientRect()
      return targetTop + targetHeight / 2 < elementTop + elementHeight / 2
    })

    return inbetween
  }

  const sortable: Action<HTMLElement> = (element) => {
    element.style.position = 'relative'

    Array.from(element.children as HTMLCollectionOf<HTMLElement>).forEach((child, i) => {
      let childStartY = 0
      let deltaY = 0

      let isDragging = false
      let empty = document.createElement('div')

      child.style.cursor = 'grab'
      child.setAttribute('data-sortable-id', `${i}`)

      child.addEventListener('mousedown', () => {
        empty.style.height = `${child.offsetHeight}px`
        empty.style.width = `${child.offsetWidth}px`
        child.before(empty)

        const { top: childTop, height: childHeight } = child.getBoundingClientRect()
        const { top: elementTop } = element.getBoundingClientRect()
        childStartY = childTop - childHeight - elementTop

        child.style.position = 'absolute'
        child.style.top = `${childStartY}px`
        child.style.cursor = 'grabbing'

        isDragging = true
      })

      document.body.addEventListener('mousemove', (event) => {
        if (isDragging) {
          /*
           * Update element position
           */
          const { movementY } = event
          deltaY += movementY

          let y = childStartY + deltaY
          if (y < 0) y = 0
          if (y > element.offsetHeight - child.offsetHeight) y = element.offsetHeight - child.offsetHeight

          child.style.top = `${y}px`

          /*
           * Update empty position
           */
          const inbetween = findDropElementPosition(element, child, Array.from(element.children as HTMLCollectionOf<HTMLElement>))
          if (inbetween) {
            if (inbetween === element.lastElementChild) inbetween.after(empty)
            else inbetween.before(empty)
          }
        }
      })

      document.body.addEventListener('mouseup', () => {
        if (isDragging) {
          child.style.removeProperty('position')
          child.style.removeProperty('top')
          child.style.cursor = 'grab'
          empty.replaceWith(child)

          isDragging = false
          childStartY = 0
          deltaY = 0

          const children = Array.from(element.children as HTMLCollectionOf<HTMLElement>)
          const itemsStrIds = children.map((child) => child.getAttribute('data-sortable-id')) as string[]
          const indices = itemsStrIds.map((id) => parseInt(id))

          const startIndex = i
          const endIndex = indices.indexOf(i)

          const movedItem = items.splice(startIndex, 1)[0]
          const newItems = items
          newItems.splice(endIndex, 0, movedItem)

          dispatch('finalize', { startIndex, endIndex, indices, items: newItems })
        }
      })
    })

    return {
      destroy() {
        Array.from(element.children as HTMLCollectionOf<HTMLElement>).forEach((child) => {})
      },
      update() {
        console.log('update')
      },
      render() {
        console.log('render')
      }
    }
  }
</script>

<div use:sortable class={$$props.class}>
  <slot />
</div>
