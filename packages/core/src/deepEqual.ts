export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true

  if (typeof a !== typeof b) return false
  if (a === null || b === null) return false
  if (typeof a !== 'object') return false

  if (typeof FileList !== 'undefined' && a instanceof FileList) {
    if (b instanceof FileList) {
      if (a.length !== b.length) return false
      return Array.from({ length: a.length }, (_, i) =>
        deepEqual(a[i], b[i]),
      ).every(Boolean)
    }
    return false
  }

  if (a instanceof File) {
    if (b instanceof File) {
      return a.name === b.name && a.size === b.size && a.type === b.type
    }
    return false
  }

  if (Array.isArray(a) !== Array.isArray(b)) return false

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((item, i) => deepEqual(item, b[i]))
  }

  const aKeys = Object.keys(a as object)
  const bKeys = Object.keys(b as object)
  if (aKeys.length !== bKeys.length) return false

  return aKeys.every((key) =>
    deepEqual(
      (a as Record<string, unknown>)[key],
      (b as Record<string, unknown>)[key],
    ),
  )
}
