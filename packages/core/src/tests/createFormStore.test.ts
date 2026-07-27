import z from 'zod'
import { describe, it, expect, vi } from 'vitest'
import { createFormStore } from '../createFormStore'

const schema = z.object({
  name: z.string().min(2, 'Name is too short'),
  email: z.email('Invalid email'),
})

const nestedSchema = z.object({
  address: z.object({
    street: z.string().min(1, 'Street is required'),
    city: z.string().min(1, 'City is required'),
  }),
})

describe('initial state', () => {
  it('exposes the default values via getValue', () => {
    const store = createFormStore(schema, { name: '', email: '' })
    expect(store.getValue('name')).toBe('')
    expect(store.getValue('email')).toBe('')
  })

  it('exposes the default values via getValues', () => {
    const store = createFormStore(schema, { name: 'Theo', email: 'a@b.com' })
    expect(store.getValues()).toEqual({ name: 'Theo', email: 'a@b.com' })
  })

  it('starts with no errors', () => {
    const store = createFormStore(schema, { name: '', email: '' })
    expect(store.getErrors()).toEqual({})
  })

  it('starts with no touched fields', () => {
    const store = createFormStore(schema, { name: '', email: '' })
    expect(store.isTouched('name')).toBeFalsy()
    expect(store.isTouched('email')).toBeFalsy()
  })

  it('starts with no dirty fields', () => {
    const store = createFormStore(schema, { name: 'Theo', email: 'a@b.com' })
    expect(store.isDirty('name')).toBe(false)
    expect(store.isDirty('email')).toBe(false)
  })
})

describe('setValue', () => {
  it('updates the value at a top-level path', () => {
    const store = createFormStore(schema, { name: '', email: '' })
    store.setValue('name', 'Theo')
    expect(store.getValue('name')).toBe('Theo')
  })

  it('notifies subscribers on each call', () => {
    const store = createFormStore(schema, { name: '', email: '' })
    const listener = vi.fn()
    store.subscribe(listener)

    store.setValue('name', 'Theo')
    store.setValue('email', 'theo@example.com')

    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('does not affect sibling fields', () => {
    const store = createFormStore(schema, { name: '', email: 'a@b.com' })
    store.setValue('name', 'Theo')
    expect(store.getValue('email')).toBe('a@b.com')
  })

  it('writes into nested paths', () => {
    const store = createFormStore(nestedSchema, {
      address: { street: '', city: '' },
    })
    store.setValue('address.street', 'Main St')
    expect(store.getValue('address.street')).toBe('Main St')
  })

  it('does not affect sibling nested fields', () => {
    const store = createFormStore(nestedSchema, {
      address: { street: '', city: 'Malmö' },
    })
    store.setValue('address.street', 'Main St')
    expect(store.getValue('address.city')).toBe('Malmö')
  })

  it('marks a field as dirty after it changes', () => {
    const store = createFormStore(schema, { name: 'Theo', email: '' })
    store.setValue('name', 'Other')
    expect(store.isDirty('name')).toBe(true)
  })

  it('does not mark an unchanged field as dirty', () => {
    const store = createFormStore(schema, { name: 'Theo', email: '' })
    store.setValue('name', 'Other')
    expect(store.isDirty('email')).toBe(false)
  })

  it('is not dirty when a field is set back to its original value', () => {
    const store = createFormStore(schema, { name: 'Theo', email: '' })
    store.setValue('name', 'Other')
    store.setValue('name', 'Theo')
    expect(store.isDirty('name')).toBe(false)
  })

  it('treats a nested object as dirty only when a deep value changes', () => {
    const store = createFormStore(nestedSchema, {
      address: { street: 'Main St', city: 'Malmö' },
    })
    store.setValue('address.street', 'Other St')
    expect(store.isDirty('address')).toBe(true)
  })

  it('treats a nested object as not dirty when deep values match the original', () => {
    const store = createFormStore(nestedSchema, {
      address: { street: 'Main St', city: 'Malmö' },
    })
    store.setValue('address.street', 'Other St')
    store.setValue('address.street', 'Main St')
    expect(store.isDirty('address')).toBe(false)
  })
})

describe('touch', () => {
  it('marks a field as touched', () => {
    const store = createFormStore(schema, { name: '', email: '' })
    store.touch('name')
    expect(store.isTouched('name')).toBe(true)
  })

  it('notifies subscribers the first time a field is touched', () => {
    const store = createFormStore(schema, { name: '', email: '' })
    const listener = vi.fn()
    store.subscribe(listener)

    store.touch('name')

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('does not notify subscribers when touching an already-touched field', () => {
    const store = createFormStore(schema, { name: '', email: '' })
    store.touch('name')

    const listener = vi.fn()
    store.subscribe(listener)
    store.touch('name')

    expect(listener).not.toHaveBeenCalled()
  })

  it('touching one field does not mark other fields as touched', () => {
    const store = createFormStore(schema, { name: '', email: '' })
    store.touch('name')
    expect(store.isTouched('email')).toBeFalsy()
  })
})

describe('validate', () => {
  it('returns a successful result when data is valid', async () => {
    const store = createFormStore(schema, {
      name: 'Theo',
      email: 'theo@example.com',
    })
    expect((await store.validate()).success).toBe(true)
  })

  it('returns a failed result when data is invalid', async () => {
    const store = createFormStore(schema, { name: 'T', email: 'not-an-email' })
    expect((await store.validate()).success).toBe(false)
  })

  it('populates errors for every failing field', async () => {
    const store = createFormStore(schema, { name: 'T', email: 'not-an-email' })
    await store.validate()
    expect(store.getErrors().name).toStrictEqual(['Name is too short'])
    expect(store.getErrors().email).toStrictEqual(['Invalid email'])
  })

  it('notifies subscribers after validation', async () => {
    const store = createFormStore(schema, { name: 'T', email: '' })
    const listener = vi.fn()
    store.subscribe(listener)
    await store.validate()
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('clears all errors once data becomes fully valid', async () => {
    const store = createFormStore(schema, { name: 'T', email: 'not-an-email' })
    await store.validate()

    store.setValue('name', 'Theodor')
    store.setValue('email', 'theo@example.com')
    await store.validate()

    expect(store.getErrors()).toEqual({})
  })

  it('clears only the resolved error while keeping others', async () => {
    const store = createFormStore(schema, { name: 'T', email: 'not-an-email' })
    await store.validate()

    store.setValue('name', 'Theodor')
    await store.validate()

    expect(store.getErrors().name).toBeUndefined()
    expect(store.getErrors().email).toBeDefined()
  })
})

describe('validateField', () => {
  it('returns the error message for an invalid field', async () => {
    const store = createFormStore(schema, { name: 'T', email: '' })
    const messages = await store.validateField('name')
    expect(messages).toStrictEqual(['Name is too short'])
  })

  it('returns undefined for a valid field', async () => {
    const store = createFormStore(schema, { name: 'Theodor', email: '' })
    const message = await store.validateField('name')
    expect(message).toBeUndefined()
  })

  it('sets the error only for the validated field', async () => {
    const store = createFormStore(schema, { name: 'T', email: 'not-an-email' })
    await store.validateField('name')
    expect(store.getErrors().name).toStrictEqual(['Name is too short'])
    expect(store.getErrors().email).toBeUndefined()
  })

  it('clears the error for a field that became valid', async () => {
    const store = createFormStore(schema, { name: 'T', email: '' })
    await store.validateField('name')
    expect(store.getErrors().name).toBeDefined()

    store.setValue('name', 'Theodor')
    await store.validateField('name')
    expect(store.getErrors().name).toBeUndefined()
  })

  it('notifies subscribers after field validation', async () => {
    const store = createFormStore(schema, { name: 'T', email: '' })
    const listener = vi.fn()
    store.subscribe(listener)
    await store.validateField('name')
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

describe('reset', () => {
  it('restores the original default values when called without arguments', () => {
    const store = createFormStore(schema, { name: 'Theo', email: 'a@b.com' })
    store.setValue('name', 'Other')
    store.reset()
    expect(store.getValue('name')).toBe('Theo')
    expect(store.getValue('email')).toBe('a@b.com')
  })

  it('clears all errors on reset', async () => {
    const store = createFormStore(schema, { name: 'T', email: '' })
    await store.validate()
    store.reset()
    expect(store.getErrors()).toEqual({})
  })

  it('clears all touched state on reset', () => {
    const store = createFormStore(schema, { name: '', email: '' })
    store.touch('name')
    store.reset()
    expect(store.isTouched('name')).toBeFalsy()
  })

  it('notifies subscribers on reset', () => {
    const store = createFormStore(schema, { name: '', email: '' })
    const listener = vi.fn()
    store.subscribe(listener)
    store.reset()
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('accepts new values to reset to', () => {
    const store = createFormStore(schema, { name: '', email: '' })
    store.reset({ name: 'New', email: 'new@example.com' })
    expect(store.getValue('name')).toBe('New')
    expect(store.getValue('email')).toBe('new@example.com')
  })

  it('does not affect original defaults when resetting with new values', () => {
    const store = createFormStore(schema, { name: 'Original', email: '' })
    store.reset({ name: 'Temporary', email: '' })
    store.setValue('name', 'Changed')
    store.reset()
    // reset() with no args should go back to the constructor defaults, not the last reset values
    expect(store.getValue('name')).toBe('Original')
  })
})

describe('addFieldError', () => {
  it('adds an error message to a field', () => {
    const store = createFormStore(schema, { name: 'Theo', email: 'a@b.com' })
    store.addFieldError('name', 'Custom error')
    expect(store.getErrors().name).toStrictEqual(['Custom error'])
  })

  it('does not affect errors on other fields', () => {
    const store = createFormStore(schema, { name: 'Theo', email: 'a@b.com' })
    store.addFieldError('name', 'Custom error')
    expect(store.getErrors().email).toBeUndefined()
  })

  it('keeps existing errors for the same field', async () => {
    const store = createFormStore(schema, { name: 'T', email: '' })
    await store.validateField('name')
    store.addFieldError('name', 'Second error')
    expect(store.getErrors().name).toStrictEqual([
      'Name is too short',
      'Second error',
    ])
  })

  it('notifies subscribers', () => {
    const store = createFormStore(schema, { name: '', email: '' })
    const listener = vi.fn()
    store.subscribe(listener)
    store.addFieldError('name', 'Custom error')
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

describe('clearFieldErrors', () => {
  it('removes an existing error for a field', async () => {
    const store = createFormStore(schema, { name: 'T', email: '' })
    await store.validateField('name')
    store.clearFieldErrors('name')
    expect(store.getErrors().name).toBeUndefined()
  })

  it('does not affect errors on other fields', async () => {
    const store = createFormStore(schema, { name: 'T', email: 'not-an-email' })
    await store.validate()
    store.clearFieldErrors('name')
    expect(store.getErrors().email).toBeDefined()
  })

  it('does not notify subscribers when the field has no error', () => {
    const store = createFormStore(schema, { name: 'Theo', email: '' })
    const listener = vi.fn()
    store.subscribe(listener)
    store.clearFieldErrors('name')
    expect(listener).not.toHaveBeenCalled()
  })

  it('notifies subscribers when an error is actually removed', async () => {
    const store = createFormStore(schema, { name: 'T', email: '' })
    await store.validateField('name')
    const listener = vi.fn()
    store.subscribe(listener)
    store.clearFieldErrors('name')
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

describe('subscribe', () => {
  it('returns an unsubscribe function', () => {
    const store = createFormStore(schema, { name: '', email: '' })
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)

    unsubscribe()
    store.setValue('name', 'Theo')

    expect(listener).not.toHaveBeenCalled()
  })

  it('supports multiple independent subscribers', () => {
    const store = createFormStore(schema, { name: '', email: '' })
    const a = vi.fn()
    const b = vi.fn()
    store.subscribe(a)
    store.subscribe(b)

    store.setValue('name', 'Theo')

    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('unsubscribing one listener does not affect others', () => {
    const store = createFormStore(schema, { name: '', email: '' })
    const a = vi.fn()
    const b = vi.fn()
    const unsubscribeA = store.subscribe(a)
    store.subscribe(b)

    unsubscribeA()
    store.setValue('name', 'Theo')

    expect(a).not.toHaveBeenCalled()
    expect(b).toHaveBeenCalledTimes(1)
  })
})
