import type { LeafValue } from './types/values'

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

export function getLeafValue(
  obj: Record<string, unknown>,
  path: string,
): LeafValue {
  return getIn<LeafValue>(obj, path)
}

export function setIn<T extends object>(
  obj: T,
  path: string,
  value: unknown,
): T {
  const [head, ...rest] = path.split('.')

  if (rest.length === 0) {
    const clone = (Array.isArray(obj) ? [...obj] : { ...obj }) as any
    clone[head] = value
    return clone as T
  }

  const existing = (obj as Record<string, unknown>)[head]
  const next = setIn(
    Array.isArray(existing) ? existing : (existing ?? {}),
    rest.join('.'),
    value,
  )

  const clone = (Array.isArray(obj) ? [...obj] : { ...obj }) as any
  clone[head] = next
  return clone as T
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
