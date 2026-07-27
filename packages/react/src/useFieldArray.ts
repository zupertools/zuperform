import { useSyncExternalStore } from 'react'
import { getIn } from '@zupertools/form-core'
import type { ArrayStoreAccess } from '@zupertools/form-core'

export function useFieldArray<TItem>(form: ArrayStoreAccess, name: string) {
  const { values } = useSyncExternalStore(form.subscribe, form.getSnapshot)
  const items = getIn<TItem[]>(values, name) ?? []

  function append(item: TItem) {
    form.setValue(name, [...items, item])
  }

  function remove(index: number) {
    form.setValue(
      name,
      items.filter((_, i) => i !== index),
    )
  }

  function move(from: number, to: number) {
    const next = [...items]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    form.setValue(name, next)
  }

  // Stable keys for React lists
  const fields = items.map((item, index) => ({
    id: `${name}-${index}`,
    index,
    item,
  }))

  return { fields, append, remove, move }
}
