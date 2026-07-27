import z, { ZodType } from 'zod'
import {
  ZodArray,
  ZodBoolean,
  ZodDefault,
  ZodNullable,
  ZodNumber,
  ZodObject,
  ZodOptional,
} from 'zod'

type AnyZodType = z.core.$ZodType

export function getSchemaAtPath(
  schema: ZodObject,
  path: string,
): ZodType | undefined {
  const keys = path.split('.')
  let current: AnyZodType = schema

  for (const key of keys) {
    current = unwrap(current)

    if (current instanceof ZodObject) {
      const shape = current.shape as Record<string, AnyZodType>
      const next = shape[key]
      if (!next) return undefined
      current = next
    } else if (current instanceof ZodArray) {
      if (!/^\d+$/.test(key)) return undefined
      current = current.element
    } else {
      return undefined
    }
  }

  return unwrap(current) as ZodType
}

function unwrap(schema: AnyZodType): AnyZodType {
  if (schema instanceof ZodOptional || schema instanceof ZodNullable) {
    return unwrap(schema.unwrap())
  }
  if (schema instanceof ZodDefault) {
    return unwrap(schema.unwrap())
  }
  return schema
}

export function coerceToSchema(
  schema: AnyZodType | undefined,
  raw: string | boolean,
): unknown {
  if (!schema) return raw
  if (schema instanceof ZodNumber) return raw === '' ? '' : Number(raw)
  if (schema instanceof ZodBoolean) return Boolean(raw)
  return raw
}
