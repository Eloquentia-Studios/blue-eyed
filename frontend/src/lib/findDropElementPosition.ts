const findDropElementPosition = (container: HTMLElement, target: HTMLElement, elements: HTMLElement[], extremeMargins = 5) => {
  const { top: targetTop, height: targetHeight } = target.getBoundingClientRect()
  const targetCenter = targetTop + targetHeight / 2

  const extremeFind = checkExtremes(container, target, extremeMargins)
  if (extremeFind === 'top') return elements[0]
  if (extremeFind === 'bottom') return elements[elements.length - 1]

  let prevElement = null
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i]
    const { top: elementTop, height: elementHeight } = element.getBoundingClientRect()
    const elementCenter = elementTop + elementHeight / 2
    if (elementCenter > targetCenter) {
      return prevElement || elements[0]
    }
    prevElement = element
  }
  return prevElement || elements[0]
}

const checkExtremes = (container: HTMLElement, target: HTMLElement, extremeMargins = 5) => {
  const { top: containerTop, height: containerHeight } = container.getBoundingClientRect()
  const { top: targetTop, height: targetHeight } = target.getBoundingClientRect()

  const relativeTargetTop = targetTop - containerTop
  const relativeTargetBottom = relativeTargetTop + targetHeight

  if (relativeTargetTop < extremeMargins) return 'top'
  if (relativeTargetBottom > containerHeight - extremeMargins) return 'bottom'
}

export default findDropElementPosition
