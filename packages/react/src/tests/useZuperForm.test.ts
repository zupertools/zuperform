import z from 'zod'
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useZuperForm } from '../useZuperForm'

const schema = z.object({
  name: z.string().min(2, 'Name is too short'),
  email: z.email('Invalid email'),
})

const boolSchema = z.object({
  active: z.boolean(),
})

function fakeSubmitEvent() {
  return {
    preventDefault: vi.fn(),
  } as unknown as React.SubmitEvent<HTMLFormElement>
}

function fakeChangeEvent(value: string) {
  return {
    target: { value, type: 'text' },
  } as React.ChangeEvent<HTMLInputElement>
}

function setup(overrides?: Partial<Parameters<typeof useZuperForm>[0]>) {
  const handler = vi.fn().mockResolvedValue(undefined)
  const { result, rerender } = renderHook(() =>
    useZuperForm({
      schema,
      defaultValues: { name: '', email: '' },
      handler,
      ...overrides,
    }),
  )
  return { result, rerender, handler }
}

describe('initial state', () => {
  it('starts with no field errors', () => {
    const { result } = setup()
    expect(result.current.getFieldErrors('name')).toBeUndefined()
    expect(result.current.getFieldErrors('email')).toBeUndefined()
  })

  it('starts with isSubmitting false', () => {
    const { result } = setup()
    expect(result.current.isSubmitting).toBe(false)
  })

  it('starts with no top-level error', () => {
    const { result } = setup()
    expect(result.current.error).toBeNull()
  })

  it('starts with isDirty false', () => {
    const { result } = setup()
    expect(result.current.isDirty).toBe(false)
  })

  it('starts with no touched fields', () => {
    const { result } = setup()
    expect(result.current.touchedFields).toEqual({})
  })
})

describe('handleSubmit', () => {
  it('does not call handler when values are invalid', async () => {
    const { result, handler } = setup()
    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })
    expect(handler).not.toHaveBeenCalled()
  })

  it('sets field errors when submit is attempted with invalid values', async () => {
    const { result } = setup()
    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })
    expect(result.current.getFieldErrors('name')).toStrictEqual([
      'Name is too short',
    ])
    expect(result.current.getFieldErrors('email')).toStrictEqual([
      'Invalid email',
    ])
  })

  it('calls handler with the parsed values when data is valid', async () => {
    const { result, handler } = setup()
    act(() => result.current.bind('name').onChange(fakeChangeEvent('Theodor')))
    act(() =>
      result.current
        .bind('email')
        .onChange(fakeChangeEvent('theo@example.com')),
    )
    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })
    expect(handler).toHaveBeenCalledWith({
      name: 'Theodor',
      email: 'theo@example.com',
    })
  })

  it('sets a top-level error when the handler throws an Error', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Server exploded'))
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: 'Theodor', email: 'theo@example.com' },
        handler,
      }),
    )
    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })
    expect(result.current.error).toBe('Server exploded')
  })

  it('sets a generic top-level error when the handler throws a non-Error', async () => {
    const handler = vi.fn().mockRejectedValue('oops')
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: 'Theodor', email: 'theo@example.com' },
        handler,
      }),
    )
    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })
    expect(result.current.error).toBe('Something went wrong')
  })

  it('clears a previous top-level error on a new successful submit', async () => {
    const handler = vi
      .fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValue(undefined)
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: 'Theodor', email: 'theo@example.com' },
        handler,
      }),
    )
    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })
    expect(result.current.error).toBe('First failure')
    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })
    expect(result.current.error).toBeNull()
  })

  it('calls preventDefault on the event', async () => {
    const { result } = setup()
    const event = fakeSubmitEvent()
    await act(async () => {
      await result.current.handleSubmit(event)
    })
    expect(event.preventDefault).toHaveBeenCalledTimes(1)
  })
})

describe('getFieldErrors', () => {
  it('returns undefined when the field has no error', () => {
    const { result } = setup()
    expect(result.current.getFieldErrors('name')).toBeUndefined()
  })

  it('returns the error message after a failed submit', async () => {
    const { result } = setup()
    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })
    expect(result.current.getFieldErrors('name')).toStrictEqual([
      'Name is too short',
    ])
  })

  it('returns undefined after the field is corrected and re-validated', async () => {
    const { result } = setup({ mode: 'onSubmit', reValidateMode: 'onChange' })
    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })
    expect(result.current.getFieldErrors('name')).toStrictEqual([
      'Name is too short',
    ])
    await act(async () => {
      result.current.bind('name').onChange(fakeChangeEvent('Theodor'))
    })
    expect(result.current.getFieldErrors('name')).toBeUndefined()
  })
})

describe('bind', () => {
  it('returns the field name', () => {
    const { result } = setup()
    expect(result.current.bind('name').name).toBe('name')
  })

  it('returns the current value', () => {
    const { result } = setup()
    expect((result.current.bind('name') as { value: string }).value).toBe('')
  })

  it('returns the updated value after onChange', () => {
    const { result } = setup()
    act(() => result.current.bind('name').onChange(fakeChangeEvent('Theodor')))
    expect((result.current.bind('name') as { value: string }).value).toBe(
      'Theodor',
    )
  })

  it('returns checked (not value) for a boolean field', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema: boolSchema,
        defaultValues: { active: false },
        handler: vi.fn(),
      }),
    )
    const bound = result.current.bind('active')
    expect('checked' in bound).toBe(true)
    expect('value' in bound).toBe(false)
  })

  it('onChange updates the store value', () => {
    const { result } = setup()
    act(() => {
      result.current.bind('name').onChange(fakeChangeEvent('Theodor'))
    })
    expect(result.current.watch('name')).toBe('Theodor')
  })

  it('onBlur marks the field as touched', () => {
    const { result } = setup()
    act(() => {
      result.current.bind('name').onBlur()
    })
    expect(result.current.touchedFields['name']).toBe(true)
  })
})

describe('watch', () => {
  it('returns all values when called with no argument', () => {
    const { result } = setup()
    expect(result.current.watch()).toEqual({ name: '', email: '' })
  })

  it('returns the value at a specific path', () => {
    const { result } = setup()
    act(() => result.current.bind('name').onChange(fakeChangeEvent('Theodor')))
    expect(result.current.watch('name')).toBe('Theodor')
  })

  it('reflects updates reactively', () => {
    const { result } = setup()
    act(() =>
      result.current
        .bind('email')
        .onChange(fakeChangeEvent('theo@example.com')),
    )
    expect(result.current.watch('email')).toBe('theo@example.com')
  })
})

describe('reset', () => {
  it('restores the original default values', () => {
    const { result } = setup()
    act(() => result.current.bind('name').onChange(fakeChangeEvent('Changed')))
    act(() => result.current.reset())
    expect(result.current.watch('name')).toBe('')
  })

  it('clears field errors on reset', async () => {
    const { result } = setup()
    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })
    act(() => result.current.reset())
    expect(result.current.getFieldErrors('name')).toBeUndefined()
  })

  it('clears touched state on reset', () => {
    const { result } = setup()
    act(() => result.current.bind('name').onBlur())
    act(() => result.current.reset())
    expect(result.current.touchedFields).toEqual({})
  })

  it('accepts new values to reset to', () => {
    const { result } = setup()
    act(() =>
      result.current.reset({ name: 'Theodor', email: 'theo@example.com' }),
    )
    expect(result.current.watch('name')).toBe('Theodor')
    expect(result.current.watch('email')).toBe('theo@example.com')
  })

  it('marks isDirty as false after reset', () => {
    const { result } = setup()
    act(() => result.current.bind('name').onChange(fakeChangeEvent('Changed')))
    expect(result.current.isDirty).toBe(true)
    act(() => result.current.reset())
    expect(result.current.isDirty).toBe(false)
  })
})

describe('resetField', () => {
  it('resets a single field to its original default', () => {
    const { result } = setup()
    act(() => result.current.bind('name').onChange(fakeChangeEvent('Theodor')))
    act(() => result.current.resetField('name'))
    expect(result.current.watch('name')).toBe('')
  })

  it('does not affect sibling fields', () => {
    const { result } = setup()
    act(() => result.current.bind('name').onChange(fakeChangeEvent('Theodor')))
    act(() =>
      result.current
        .bind('email')
        .onChange(fakeChangeEvent('theo@example.com')),
    )
    act(() => result.current.resetField('name'))
    expect(result.current.watch('email')).toBe('theo@example.com')
  })

  it('accepts a new value to reset to', () => {
    const { result } = setup()
    act(() => result.current.resetField('name', 'NewName'))
    expect(result.current.watch('name')).toBe('NewName')
  })

  it('clears the field error', async () => {
    const { result } = setup()
    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })
    expect(result.current.getFieldErrors('name')).toStrictEqual([
      'Name is too short',
    ])
    act(() => result.current.resetField('name'))
    expect(result.current.getFieldErrors('name')).toBeUndefined()
  })

  it('does not clear errors on sibling fields', async () => {
    const { result } = setup()
    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })
    act(() => result.current.resetField('name'))
    expect(result.current.getFieldErrors('email')).toStrictEqual([
      'Invalid email',
    ])
  })

  it('clears the touched state for the field', () => {
    const { result } = setup()
    act(() => result.current.bind('name').onBlur())
    expect(result.current.touchedFields['name']).toBe(true)
    act(() => result.current.resetField('name'))
    expect(result.current.touchedFields['name']).toBeUndefined()
  })

  it('marks the field as not dirty after reset', () => {
    const { result } = setup()
    act(() => result.current.bind('name').onChange(fakeChangeEvent('Changed')))
    expect(result.current.dirtyFields['name']).toBe(true)
    act(() => result.current.resetField('name'))
    expect(result.current.dirtyFields['name']).toBeUndefined()
  })
})

describe('setValue', () => {
  it('updates the field value', () => {
    const { result } = setup()
    act(() => result.current.setValue('name', 'Theodor'))
    expect(result.current.watch('name')).toBe('Theodor')
  })

  it('does not affect sibling fields', () => {
    const { result } = setup()
    act(() => result.current.setValue('name', 'Theodor'))
    expect(result.current.watch('email')).toBe('')
  })

  it('marks the field as dirty', () => {
    const { result } = setup()
    act(() => result.current.setValue('name', 'Theodor'))
    expect(result.current.dirtyFields['name']).toBe(true)
  })

  it('does not mark an unchanged field as dirty', () => {
    const { result } = setup()
    act(() => result.current.setValue('name', 'Theodor'))
    expect(result.current.dirtyFields['email']).toBeUndefined()
  })

  it('marks the field as not dirty when set back to the default value', () => {
    const { result } = setup()
    act(() => result.current.setValue('name', 'Theodor'))
    act(() => result.current.setValue('name', ''))
    expect(result.current.dirtyFields['name']).toBeUndefined()
  })

  it('does not clear existing field errors', async () => {
    const { result } = setup()
    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })
    act(() => result.current.setValue('name', 'X'))
    expect(result.current.getFieldErrors('name')).toStrictEqual([
      'Name is too short',
    ])
  })
})

describe('setError', () => {
  it('sets a top-level error when called with a single string', () => {
    const { result } = setup()
    act(() => result.current.setError('Something went wrong'))
    expect(result.current.error).toBe('Something went wrong')
  })

  it('sets a field error when called with a path and a message', () => {
    const { result } = setup()
    act(() => result.current.setError('name', ['Custom error']))
    expect(result.current.getFieldErrors('name')).toStrictEqual([
      'Custom error',
    ])
  })

  it('field error from setError does not affect other fields', () => {
    const { result } = setup()
    act(() => result.current.setError('name', ['Custom error']))
    expect(result.current.getFieldErrors('email')).toBeUndefined()
  })

  it('replaces existing field errors when setError is called with new messages', () => {
    const { result } = setup()
    act(() => result.current.setError('name', ['First error']))
    expect(result.current.getFieldErrors('name')).toStrictEqual(['First error'])
    act(() => result.current.setError('name', ['Second error']))
    expect(result.current.getFieldErrors('name')).toStrictEqual([
      'Second error',
    ])
  })

  it('triggers a re-render when getFieldErrors is called after setError', () => {
    const { result } = setup()
    act(() => result.current.setError('name', ['Custom error']))
    // Verify getFieldErrors returns the new error (would be undefined if not re-rendered)
    expect(result.current.getFieldErrors('name')).toStrictEqual([
      'Custom error',
    ])
  })
})

describe('addFieldError', () => {
  it('adds an error message to a field', () => {
    const { result } = setup()
    act(() => result.current.addFieldError('name', ['Custom error']))
    expect(result.current.getFieldErrors('name')).toStrictEqual([
      'Custom error',
    ])
  })

  it('appends to existing errors for the same field', async () => {
    const { result } = setup()
    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })
    expect(result.current.getFieldErrors('name')).toStrictEqual([
      'Name is too short',
    ])
    act(() => result.current.addFieldError('name', ['Additional error']))
    expect(result.current.getFieldErrors('name')).toStrictEqual([
      'Name is too short',
      'Additional error',
    ])
  })

  it('does not affect errors on other fields', () => {
    const { result } = setup()
    act(() => result.current.addFieldError('name', ['Custom error']))
    expect(result.current.getFieldErrors('email')).toBeUndefined()
  })

  it('triggers a re-render when getFieldErrors is called after addFieldError', () => {
    const { result } = setup()
    act(() => result.current.addFieldError('name', ['Custom error']))
    // Verify getFieldErrors returns the new error (would be undefined if not re-rendered)
    expect(result.current.getFieldErrors('name')).toStrictEqual([
      'Custom error',
    ])
  })

  it('allows adding multiple errors one at a time', () => {
    const { result } = setup()
    act(() => result.current.addFieldError('name', ['First error']))
    act(() => result.current.addFieldError('name', ['Second error']))
    act(() => result.current.addFieldError('name', ['Third error']))
    expect(result.current.getFieldErrors('name')).toStrictEqual([
      'First error',
      'Second error',
      'Third error',
    ])
  })
})

describe('isDirty / dirtyFields', () => {
  it('isDirty is false when no fields have changed', () => {
    const { result } = setup()
    expect(result.current.isDirty).toBe(false)
  })

  it('isDirty is true after a field changes', () => {
    const { result } = setup()
    act(() => result.current.bind('name').onChange(fakeChangeEvent('Theodor')))
    expect(result.current.isDirty).toBe(true)
  })

  it('isDirty is false when a field is changed back to its original value', () => {
    const { result } = setup()
    act(() => result.current.bind('name').onChange(fakeChangeEvent('Theodor')))
    act(() => result.current.bind('name').onChange(fakeChangeEvent('')))
    expect(result.current.isDirty).toBe(false)
  })

  it('dirtyFields contains only the fields that changed', () => {
    const { result } = setup()
    act(() => result.current.bind('name').onChange(fakeChangeEvent('Theodor')))
    expect(result.current.dirtyFields['name']).toBe(true)
    expect(result.current.dirtyFields['email']).toBeUndefined()
  })
})

describe('mode / reValidateMode', () => {
  it('does not validate on change by default (onSubmit mode)', () => {
    const { result } = setup({ mode: 'onSubmit' })
    act(() => {
      result.current.bind('name').onChange(fakeChangeEvent('X'))
    })
    expect(result.current.getFieldErrors('name')).toBeUndefined()
  })

  it('validates on blur when mode is onBlur', async () => {
    const { result } = setup({ mode: 'onBlur' })
    act(() => {
      result.current.bind('name').onChange(fakeChangeEvent('X'))
    })
    await act(async () => {
      result.current.bind('name').onBlur()
    })
    expect(result.current.getFieldErrors('name')).toStrictEqual([
      'Name is too short',
    ])
  })

  it('re-validates on change when an error is already present (reValidateMode onChange)', async () => {
    const { result } = setup({ mode: 'onSubmit', reValidateMode: 'onChange' })
    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })
    expect(result.current.getFieldErrors('name')).toStrictEqual([
      'Name is too short',
    ])
    await act(async () => {
      result.current.bind('name').onChange(fakeChangeEvent('Theodor'))
    })
    expect(result.current.getFieldErrors('name')).toBeUndefined()
  })
})
