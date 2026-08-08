import z, { type ZodObject, type ZodType } from 'zod'

export function isAsyncSchema(
  schema: ZodType,
  probeValue: unknown = undefined,
): boolean {
  try {
    schema.safeParse(probeValue)
    return false
  } catch (err) {
    return err instanceof z.core.$ZodAsyncError
  }
}

export function getAsyncFields<T extends ZodObject>(
  schema: T,
  defaultValues: z.input<T>,
): Set<string> {
  const asyncFields = new Set<string>()
  const shape = schema.shape
  for (const [key, fieldSchema] of Object.entries(shape)) {
    if (isAsyncSchema(fieldSchema as ZodType, (defaultValues as any)[key])) {
      asyncFields.add(key)
    }
  }
  return asyncFields
}
