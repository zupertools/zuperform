import { describe, it, expect } from 'vitest'
import z from 'zod'
import { getSchemaAtPath, coerceToSchema } from '../schemaIntrospection'

const flat = z.object({
  name: z.string(),
  age: z.number(),
  active: z.boolean(),
})

const nested = z.object({
  user: z.object({
    name: z.string(),
    address: z.object({
      city: z.string(),
    }),
  }),
})

const withArray = z.object({
  tags: z.array(z.string()),
  items: z.array(
    z.object({
      qty: z.number(),
    }),
  ),
})

const withEnum = z.object({
  size: z.enum(['sm', 'md', 'lg']),
  priority: z.enum(['low', 'medium', 'high']).optional(),
})

const withWrappers = z.object({
  nickname: z.string().optional(),
  score: z.number().nullable(),
  bio: z.string().default(''),
  level: z.number().optional().nullable().default(1),
})

describe('getSchemaAtPath', () => {
  describe('flat object', () => {
    it('returns the schema for a top-level string field', () => {
      const result = getSchemaAtPath(flat, 'name')
      expect(result).toBeInstanceOf(z.ZodString)
    })

    it('returns the schema for a top-level number field', () => {
      const result = getSchemaAtPath(flat, 'age')
      expect(result).toBeInstanceOf(z.ZodNumber)
    })

    it('returns the schema for a top-level boolean field', () => {
      const result = getSchemaAtPath(flat, 'active')
      expect(result).toBeInstanceOf(z.ZodBoolean)
    })

    it('returns undefined for a missing field', () => {
      expect(getSchemaAtPath(flat, 'missing')).toBeUndefined()
    })
  })

  describe('nested object', () => {
    it('returns the schema two levels deep', () => {
      const result = getSchemaAtPath(nested, 'user.name')
      expect(result).toBeInstanceOf(z.ZodString)
    })

    it('returns the schema three levels deep', () => {
      const result = getSchemaAtPath(nested, 'user.address.city')
      expect(result).toBeInstanceOf(z.ZodString)
    })

    it('returns undefined when an intermediate key is missing', () => {
      expect(getSchemaAtPath(nested, 'user.phone.number')).toBeUndefined()
    })
  })

  describe('enum fields', () => {
    it('returns ZodEnum for an enum field', () => {
      const result = getSchemaAtPath(withEnum, 'size')
      expect(result).toBeInstanceOf(z.ZodEnum)
    })

    it('exposes the enum options on the returned schema', () => {
      const result = getSchemaAtPath(withEnum, 'size') as z.ZodEnum
      expect(result.options).toEqual(['sm', 'md', 'lg'])
    })

    it('unwraps ZodOptional around a ZodEnum', () => {
      const result = getSchemaAtPath(withEnum, 'priority')
      expect(result).toBeInstanceOf(z.ZodEnum)
    })

    it('returns undefined for a value not in the enum options', () => {
      const result = getSchemaAtPath(withEnum, 'size') as z.ZodEnum
      expect(result.options).not.toContain('xl')
    })
  })

  describe('array fields', () => {
    it('returns the element schema for a numeric index into a primitive array', () => {
      const result = getSchemaAtPath(withArray, 'tags.0')
      expect(result).toBeInstanceOf(z.ZodString)
    })

    it('returns the element schema for a numeric index into an object array', () => {
      const result = getSchemaAtPath(withArray, 'items.0')
      expect(result).toBeInstanceOf(z.ZodObject)
    })

    it('resolves a field inside an array element', () => {
      const result = getSchemaAtPath(withArray, 'items.2.qty')
      expect(result).toBeInstanceOf(z.ZodNumber)
    })

    it('returns undefined for a non-numeric key on an array', () => {
      expect(getSchemaAtPath(withArray, 'tags.foo')).toBeUndefined()
    })
  })

  describe('unwrapping optional / nullable / default', () => {
    it('unwraps ZodOptional and returns the inner schema', () => {
      const result = getSchemaAtPath(withWrappers, 'nickname')
      expect(result).toBeInstanceOf(z.ZodString)
    })

    it('unwraps ZodNullable and returns the inner schema', () => {
      const result = getSchemaAtPath(withWrappers, 'score')
      expect(result).toBeInstanceOf(z.ZodNumber)
    })

    it('unwraps ZodDefault and returns the inner schema', () => {
      const result = getSchemaAtPath(withWrappers, 'bio')
      expect(result).toBeInstanceOf(z.ZodString)
    })

    it('unwraps deeply stacked wrappers', () => {
      const result = getSchemaAtPath(withWrappers, 'level')
      expect(result).toBeInstanceOf(z.ZodNumber)
    })
  })
})

describe('coerceToSchema', () => {
  describe('when schema is undefined', () => {
    it('returns the raw value unchanged', () => {
      expect(coerceToSchema(undefined, 'hello')).toBe('hello')
      expect(coerceToSchema(undefined, true)).toBe(true)
    })
  })

  describe('ZodNumber', () => {
    const numSchema = z.number()

    it('coerces a numeric string to a number', () => {
      expect(coerceToSchema(numSchema, '42')).toBe(42)
    })

    it('coerces a decimal string to a number', () => {
      expect(coerceToSchema(numSchema, '3.14')).toBeCloseTo(3.14)
    })

    it('returns an empty string as-is (empty input sentinel)', () => {
      expect(coerceToSchema(numSchema, '')).toBe('')
    })
  })

  describe('ZodBoolean', () => {
    const boolSchema = z.boolean()

    it('coerces the boolean true to true', () => {
      expect(coerceToSchema(boolSchema, true)).toBe(true)
    })

    it('coerces the boolean false to false', () => {
      expect(coerceToSchema(boolSchema, false)).toBe(false)
    })

    it('coerces a non-empty string to true', () => {
      expect(coerceToSchema(boolSchema, 'yes')).toBe(true)
    })

    it('coerces an empty string to false', () => {
      expect(coerceToSchema(boolSchema, '')).toBe(false)
    })
  })

  describe('ZodString (and other schemas)', () => {
    const strSchema = z.string()

    it('returns the string value unchanged', () => {
      expect(coerceToSchema(strSchema, 'hello')).toBe('hello')
    })

    it('returns an empty string unchanged', () => {
      expect(coerceToSchema(strSchema, '')).toBe('')
    })
  })
})
