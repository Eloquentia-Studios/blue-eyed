import type SortData from './SortData.d'

type SortEvent<T> = CustomEvent<SortData<T>>

export default SortEvent
