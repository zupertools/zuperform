import { Paths } from './types/paths'

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
