import z, { ZodDate, ZodType } from 'zod'
import {
  ZodArray,
  ZodBoolean,
  ZodDefault,
  ZodNullable,
  ZodNumber,
  ZodObject,
  ZodOptional,
} from 'zod'
import type { LeafValue } from './types/values'

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
  if (schema instanceof ZodDate) return new Date(raw as string)
  return raw
}

export function stringifyValue(value: LeafValue, inputType: string): string {
  if (value instanceof Date)
    return inputType === 'datetime-local'
      ? value.toISOString().slice(0, -5)
      : value.toISOString().split('T')[0]
  if (value instanceof File) return value.name
  if (value === null || value === undefined) return ''
  return String(value)
}
