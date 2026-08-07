import { type ZodObject, z } from 'zod'
import { getSchemaAtPath } from './schemaIntrospection'
import { getIn } from './pathUtils'
import { commonAncestorPath } from './deps'

export function mapIssuesToErrors(
  issues: z.core.$ZodIssue[],
  prefix = '',
): Record<string, string[]> {
  const errors: Record<string, string[]> = {}
  for (const issue of issues) {
    const key = `${prefix}${issue.path.join('.')}`
    ;(errors[key] ??= []).push(issue.message)
  }
  return errors
}

export async function validateAll<T extends ZodObject>(
  schema: T,
  values: z.infer<T>,
) {
  const result = await schema.safeParseAsync(values)
  const errors = result.success ? {} : mapIssuesToErrors(result.error.issues)
  return { result, errors }
}

export async function validateField<T extends ZodObject>(
  schema: T,
  values: z.infer<T>,
  path: string,
): Promise<string[] | undefined> {
  const fieldSchema = getSchemaAtPath(schema, path)
  if (!fieldSchema) return undefined

  const rawValue = getIn(values, path)
  const result = await fieldSchema.safeParseAsync(rawValue)
  if (result.success) return undefined
  return result.error.issues.map((i) => i.message)
}

export async function validateFieldWithDeps<T extends ZodObject>(
  schema: T,
  values: z.infer<T>,
  path: string,
  deps: string[],
): Promise<Record<string, string[] | undefined>> {
  const allPaths = [path, ...deps]
  const ancestorPath = commonAncestorPath(allPaths)

  const ancestorSchema = ancestorPath
    ? getSchemaAtPath(schema, ancestorPath)
    : schema
  const ancestorValue = ancestorPath ? getIn(values, ancestorPath) : values
  if (!ancestorSchema)
    return Object.fromEntries(allPaths.map((p) => [p, undefined]))

  const result = await ancestorSchema.safeParseAsync(ancestorValue)
  if (result.success)
    return Object.fromEntries(allPaths.map((p) => [p, undefined]))

  const prefix = ancestorPath ? `${ancestorPath}.` : ''
  const errors = mapIssuesToErrors(result.error.issues, prefix)
  return Object.fromEntries(allPaths.map((p) => [p, errors[p]]))
}
