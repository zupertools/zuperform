import type { ZodObject, z } from 'zod'
import { getSchemaAtPath } from './schemaIntrospection'
import { getIn } from './pathUtils'

export function mapIssuesToErrors(
  issues: z.core.$ZodIssue[],
): Record<string, string[]> {
  const errors: Record<string, string[]> = {}
  for (const issue of issues) {
    const key = issue.path.join('')
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
