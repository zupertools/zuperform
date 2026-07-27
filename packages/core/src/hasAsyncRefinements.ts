import type { ZodType } from 'zod'

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

function fnIsAsync(fn: unknown): boolean {
  return typeof fn === 'function' && fn instanceof AsyncFunction
}

function hasAsyncRefinements(schema: ZodType, seen = new WeakSet()): boolean {
  if (seen.has(schema)) return false
  seen.add(schema)

  const def = (schema as any)._zod?.def
  if (!def) return false

  // Check this schema's own checks array (where .refine() and .superRefine() live)
  for (const check of def.checks ?? []) {
    const checkDef = check?._zod?.def
    if (checkDef?.check === 'custom') {
      if (fnIsAsync(checkDef.fn)) return true
      // superRefine wraps the fn in a closure, so check the check fn itself
      if (fnIsAsync(check?._zod?.check)) return true
    }
  }

  // Check if this schema is a ZodTransform with an async transform fn
  if (def.type === 'transform' && fnIsAsync(def.transform)) return true

  // Collect child schemas and recurse
  const children: unknown[] = [
    def.innerType,
    def.element,
    def.valueType,
    def.keyType,
    def.in,
    def.out,
    def.left,
    def.right,
    ...(def.options ?? []),
    ...(def.items ?? []),
    def.rest,
    ...(def.shape ? Object.values(def.shape) : []),
  ]

  // Handle z.lazy() separately to avoid eager resolution issues
  if (def.type === 'lazy' && typeof def.getter === 'function') {
    try {
      children.push(def.getter())
    } catch {}
  }

  return children.some(
    (child): boolean =>
      child != null &&
      typeof child === 'object' &&
      '_zod' in child &&
      hasAsyncRefinements(child as ZodType, seen),
  )
}

/**
 * Scans a Zod object schema and returns a Set of top-level field paths
 * that have async refinements anywhere in their schema tree.
 *
 * Note: only detects functions declared with the `async` keyword. A sync
 * function that returns a Promise won't be detected.
 */
export function getAsyncFields(schema: ZodType): Set<string> {
  const asyncFields = new Set<string>()
  const shape = (schema as any)._zod?.def?.shape
  if (!shape) return asyncFields

  for (const [key, fieldSchema] of Object.entries(shape)) {
    if (hasAsyncRefinements(fieldSchema as ZodType)) {
      asyncFields.add(key)
    }
  }

  return asyncFields
}
