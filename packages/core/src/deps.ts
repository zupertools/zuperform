import z, { ZodObject } from 'zod'
import { getSchemaAtPath } from './schemaIntrospection'
import { Paths } from './types/paths'
import { isAsyncSchema } from './async'
import { getIn } from './pathUtils'

type SchemaDeps<T> = Partial<Record<Paths<T>, Paths<T>[]>>

export function reverseMapDeps<T>(deps: SchemaDeps<T>): SchemaDeps<T> {
  if (!deps) return {} as SchemaDeps<T>

  const result = {} as SchemaDeps<T>

  for (const [key, values] of Object.entries(deps)) {
    for (const value of values as Paths<T>[]) {
      if (!result[value]) {
        result[value] = []
      }
      result[value].push(key as Paths<T>)
    }
  }

  return result
}

export function commonAncestorPath(paths: string[]): string {
  const segmentLists = paths.map((p) => p.split('.'))
  const minLength = Math.min(...segmentLists.map((s) => s.length))
  let i = 0
  while (
    i < minLength - 1 && // Never consume the final leaf segment
    segmentLists.every((segs) => segs[i] === segmentLists[0][i])
  ) {
    i++
  }
  return segmentLists[0].slice(0, i).join('.')
}

export function getAsyncDeps<T extends ZodObject>(
  schema: T,
  deps: SchemaDeps<z.infer<T>>,
  probeValue: z.infer<T>,
) {
  return new Set(
    Object.entries(deps ?? {})
      .filter(([key, depList]) => {
        const ancestorPath = commonAncestorPath([
          key,
          ...(depList as Paths<T>[]),
        ])
        const ancestorSchema = ancestorPath
          ? getSchemaAtPath(schema, ancestorPath)
          : schema
        const ancestorValue = ancestorPath
          ? getIn(probeValue, ancestorPath)
          : probeValue
        return ancestorSchema && isAsyncSchema(ancestorSchema, ancestorValue)
      })
      .map(([key]) => key),
  )
}
