export function getIn<TValue = unknown>(
  obj: Record<string, unknown>,
  path: string,
): TValue | undefined {
  return path
    .split('.')
    .reduce(
      (acc: Record<string, unknown> | undefined, key) =>
        acc == null
          ? undefined
          : (acc[key] as Record<string, unknown> | undefined),
      obj,
    ) as TValue | undefined
}

export function setIn<T extends object>(
  obj: T,
  path: string,
  value: unknown,
): T {
  const keys = path.split('.')
  const [head, ...rest] = keys

  if (rest.length === 0) {
    return { ...obj, [head]: value }
  }

  const existing = ((obj as Record<string, unknown>)[head] ?? {}) as Record<
    string,
    unknown
  >
  return { ...obj, [head]: setIn(existing, rest.join('.'), value) }
}

export function flattenPaths(
  obj: Record<string, unknown>,
  prefix = '',
): string[] {
  return Object.entries(obj).flatMap(([key, val]) => {
    const path = prefix ? `${prefix}.${key}` : key
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      return flattenPaths(val as Record<string, unknown>, path)
    }
    if (Array.isArray(val)) {
      return val.flatMap((item, i) =>
        item !== null && typeof item === 'object'
          ? flattenPaths(item as Record<string, unknown>, `${path}.${i}`)
          : [`${path}.${i}`],
      )
    }
    return [path]
  })
}
