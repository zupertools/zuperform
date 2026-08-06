import z from 'zod'
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useZuperForm } from '../useZuperForm'

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

const numberSchema = z.object({
  age: z.number().min(18, 'Must be an adult'),
})

const boolSchema = z.object({
  agree: z.boolean(),
})

const dateSchema = z.object({
  birthday: z.date(),
})

const selectSchema = z.object({
  size: z.enum(['sm', 'md', 'lg']),
})

const asyncSchema = z.object({
  username: z.string().refine(async (value) => {
    await new Promise((resolve) => setTimeout(resolve, 5))
    return value !== 'taken'
  }, 'Username is taken'),
})

function makeChangeEvent(value: string) {
  return {
    target: { value },
  } as unknown as React.ChangeEvent<HTMLInputElement>
}

function makeCheckboxEvent(checked: boolean) {
  const target = document.createElement('input')
  target.type = 'checkbox'
  target.checked = checked
  return { target } as unknown as React.ChangeEvent<HTMLInputElement>
}

function makeFileEvent(files: File[], multiple = false) {
  const target = document.createElement('input')
  target.type = 'file'
  if (multiple) target.multiple = true

  const fileList = {
    length: files.length,
    item: (i: number) => files[i] ?? null,
    [Symbol.iterator]: function* () {
      yield* files
    },
  }
  files.forEach((file, i) => {
    Object.defineProperty(fileList, i, { value: file, enumerable: true })
  })
  Object.defineProperty(target, 'files', {
    value: fileList,
    configurable: true,
  })

  return { target } as unknown as React.ChangeEvent<HTMLInputElement>
}

function makeSubmitEvent() {
  return {
    preventDefault: vi.fn(),
  } as unknown as React.SubmitEvent<HTMLFormElement>
}

async function flushMicrotasks() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

describe('initial state', () => {
  it('exposes the provided default values via watch()', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: 'Theo', email: 'theo@example.com' },
        handler: vi.fn(),
      }),
    )
    expect(result.current.watch()).toEqual({
      name: 'Theo',
      email: 'theo@example.com',
    })
  })

  it('starts with no errors', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: '', email: '' },
        handler: vi.fn(),
      }),
    )
    expect(result.current.getFieldErrors('name')).toBeUndefined()
    expect(result.current.getFieldErrors('email')).toBeUndefined()
  })

  it('starts with isSubmitting false', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: '', email: '' },
        handler: vi.fn(),
      }),
    )
    expect(result.current.isSubmitting).toBe(false)
  })

  it('starts with a null top-level error', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: '', email: '' },
        handler: vi.fn(),
      }),
    )
    expect(result.current.error).toBeNull()
  })

  it('starts with no touched fields', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: '', email: '' },
        handler: vi.fn(),
      }),
    )
    expect(result.current.touchedFields).toEqual({})
  })

  it('starts with no dirty fields', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: 'Theo', email: 'theo@example.com' },
        handler: vi.fn(),
      }),
    )
    expect(result.current.dirtyFields).toEqual({})
    expect(result.current.isDirty).toBe(false)
  })
})

describe('watch', () => {
  it('returns the full values object when called without arguments', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: 'Theo', email: 'theo@example.com' },
        handler: vi.fn(),
      }),
    )
    expect(result.current.watch()).toEqual({
      name: 'Theo',
      email: 'theo@example.com',
    })
  })

  it('returns a single field value when a path is provided', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: 'Theo', email: 'theo@example.com' },
        handler: vi.fn(),
      }),
    )
    expect(result.current.watch('name')).toBe('Theo')
  })

  it('returns a nested field value', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema: nestedSchema,
        defaultValues: { address: { street: 'Main St', city: 'Malmö' } },
        handler: vi.fn(),
      }),
    )
    expect(result.current.watch('address.street')).toBe('Main St')
  })

  it('reflects updates made via setValue', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: 'Theo', email: '' },
        handler: vi.fn(),
      }),
    )
    act(() => {
      result.current.setValue('name', 'Other')
    })
    expect(result.current.watch('name')).toBe('Other')
  })
})

describe('bind - text input', () => {
  it('returns name, type, value, onChange, and onBlur props', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: 'Theo', email: '' },
        handler: vi.fn(),
      }),
    )
    const props = result.current.bind('name', 'text')
    expect(props.name).toBe('name')
    expect(props.type).toBe('text')
    expect(props.value).toBe('Theo')
    expect(typeof props.onChange).toBe('function')
    expect(typeof props.onBlur).toBe('function')
  })

  it('stringifies non-string default values', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema: numberSchema,
        defaultValues: { age: 21 },
        handler: vi.fn(),
      }),
    )
    const props = result.current.bind('age', 'number')
    expect(props.value).toBe('21')
  })

  it('updates the store value when onChange fires', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: '', email: '' },
        handler: vi.fn(),
      }),
    )
    act(() => {
      result.current.bind('name', 'text').onChange(makeChangeEvent('Theo'))
    })
    expect(result.current.watch('name')).toBe('Theo')
  })

  it('reflects the raw typed value even mid-typing before coercion settles', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema: numberSchema,
        defaultValues: { age: 0 },
        handler: vi.fn(),
      }),
    )
    act(() => {
      result.current.bind('age', 'number').onChange(makeChangeEvent('1'))
    })
    const props = result.current.bind('age', 'number')
    expect(props.value).toBe('1')
  })

  it('coerces a numeric input to a number in the underlying value', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema: numberSchema,
        defaultValues: { age: 0 },
        handler: vi.fn(),
      }),
    )
    act(() => {
      result.current.bind('age', 'number').onChange(makeChangeEvent('25'))
    })
    expect(result.current.watch('age')).toBe(25)
  })

  it('does not validate on change when mode is onSubmit', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: '', email: '' },
        handler: vi.fn(),
        mode: 'onSubmit',
      }),
    )
    act(() => {
      result.current.bind('name', 'text').onChange(makeChangeEvent('T'))
    })
    expect(result.current.getFieldErrors('name')).toBeUndefined()
  })

  it('validates on change when mode is onChange', async () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: '', email: '' },
        handler: vi.fn(),
        mode: 'onChange',
      }),
    )
    act(() => {
      result.current.bind('name', 'text').onChange(makeChangeEvent('T'))
    })
    await flushMicrotasks()
    expect(result.current.getFieldErrors('name')).toStrictEqual([
      'Name is too short',
    ])
  })

  it('does not re-validate on change by default once a field is valid', async () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: '', email: '' },
        handler: vi.fn(),
        mode: 'onChange',
        reValidateMode: 'onBlur',
      }),
    )
    act(() => {
      result.current.bind('name', 'text').onChange(makeChangeEvent('T'))
    })
    await flushMicrotasks()
    expect(result.current.getFieldErrors('name')).toStrictEqual([
      'Name is too short',
    ])

    act(() => {
      result.current.bind('name', 'text').onChange(makeChangeEvent('Theo'))
    })
    await flushMicrotasks()
    // reValidateMode is onBlur, so the stale error should still show after typing more
    expect(result.current.getFieldErrors('name')).toStrictEqual([
      'Name is too short',
    ])
  })

  it('re-validates on change when a field has an error and reValidateMode is onChange', async () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: '', email: '' },
        handler: vi.fn(),
        mode: 'onChange',
        reValidateMode: 'onChange',
      }),
    )
    act(() => {
      result.current.bind('name', 'text').onChange(makeChangeEvent('T'))
    })
    await flushMicrotasks()
    expect(result.current.getFieldErrors('name')).toStrictEqual([
      'Name is too short',
    ])

    act(() => {
      result.current.bind('name', 'text').onChange(makeChangeEvent('Theo'))
    })
    await flushMicrotasks()
    expect(result.current.getFieldErrors('name')).toBeUndefined()
  })

  it('touches the field on blur', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: '', email: '' },
        handler: vi.fn(),
      }),
    )
    act(() => {
      result.current.bind('name', 'text').onBlur()
    })
    expect(result.current.touchedFields.name).toBe(true)
  })

  it('does not validate on blur by default', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: '', email: '' },
        handler: vi.fn(),
      }),
    )
    act(() => {
      result.current.bind('name', 'text').onBlur()
    })
    expect(result.current.getFieldErrors('name')).toBeUndefined()
  })

  it('validates on blur when mode is onBlur', async () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: '', email: '' },
        handler: vi.fn(),
        mode: 'onBlur',
      }),
    )
    act(() => {
      result.current.bind('name', 'text').onBlur()
    })
    await flushMicrotasks()
    expect(result.current.getFieldErrors('name')).toStrictEqual([
      'Name is too short',
    ])
  })

  it('re-validates on blur when the field already has an error and reValidateMode is onBlur', async () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: '', email: '' },
        handler: vi.fn(),
        mode: 'onBlur',
        reValidateMode: 'onBlur',
      }),
    )
    act(() => {
      result.current.bind('name', 'text').onBlur()
    })
    await flushMicrotasks()
    expect(result.current.getFieldErrors('name')).toStrictEqual([
      'Name is too short',
    ])

    act(() => {
      result.current.setValue('name', 'Theo')
      result.current.bind('name', 'text').onBlur()
    })
    await flushMicrotasks()
    expect(result.current.getFieldErrors('name')).toBeUndefined()
  })
})

describe('bind - checkbox input', () => {
  it('returns checked based on the coerced boolean value by default', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema: boolSchema,
        defaultValues: { agree: true },
        handler: vi.fn(),
      }),
    )
    const props = result.current.bind('agree', 'checkbox')
    expect(props.checked).toBe(true)
    expect(props.type).toBe('checkbox')
  })

  it('updates checked state when onChange fires', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema: boolSchema,
        defaultValues: { agree: false },
        handler: vi.fn(),
      }),
    )
    act(() => {
      result.current.bind('agree', 'checkbox').onChange(makeCheckboxEvent(true))
    })
    expect(result.current.watch('agree')).toBe(true)
    expect(result.current.bind('agree', 'checkbox').checked).toBe(true)
  })
})

describe('bind - file input', () => {
  it('returns name, type, onChange and onBlur without a value prop', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: '', email: '' },
        handler: vi.fn(),
      }),
    )
    const props = result.current.bind('name', 'file')
    expect(props).toEqual({
      name: 'name',
      type: 'file',
      onChange: expect.any(Function),
      onBlur: expect.any(Function),
    })
  })

  it('stores a single file directly for a non-multiple input', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: '', email: '' },
        handler: vi.fn(),
      }),
    )
    const file = new File(['content'], 'avatar.png', { type: 'image/png' })
    act(() => {
      result.current.bind('name', 'file').onChange(makeFileEvent([file]))
    })
    expect(result.current.watch('name')).toBe(file)
  })

  it('stores the FileList directly for a multiple input', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: '', email: '' },
        handler: vi.fn(),
      }),
    )
    const files = [new File(['a'], 'a.png'), new File(['b'], 'b.png')]
    act(() => {
      result.current.bind('name', 'file').onChange(makeFileEvent(files, true))
    })
    const stored = result.current.watch('name') as unknown as {
      length: number
      item: (i: number) => File | null
    }
    expect(stored.length).toBe(2)
    expect(stored.item(0)).toBe(files[0])
    expect(stored.item(1)).toBe(files[1])
  })
})

describe('bind - radio input', () => {
  it('returns name, type, onChange and onBlur without a value prop', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema: selectSchema,
        defaultValues: { size: 'sm' },
        handler: vi.fn(),
      }),
    )
    const props = result.current.bind('size', 'radio')
    expect(props).toEqual({
      name: 'size',
      type: 'radio',
      onChange: expect.any(Function),
      onBlur: expect.any(Function),
    })
  })
})

describe('bind - select input', () => {
  it('returns a value prop without a type prop', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema: selectSchema,
        defaultValues: { size: 'md' },
        handler: vi.fn(),
      }),
    )
    const props = result.current.bind('size', 'select')
    expect(props.value).toBe('md')
    expect((props as { type?: string }).type).toBeUndefined()
  })

  it('updates the value when onChange fires', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema: selectSchema,
        defaultValues: { size: 'md' },
        handler: vi.fn(),
      }),
    )
    act(() => {
      result.current.bind('size', 'select').onChange(makeChangeEvent('lg'))
    })
    expect(result.current.watch('size')).toBe('lg')
  })
})

describe('bind - date input', () => {
  it('stringifies a Date default value as an ISO date', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema: dateSchema,
        defaultValues: { birthday: new Date('2000-01-15T00:00:00.000Z') },
        handler: vi.fn(),
      }),
    )
    const props = result.current.bind('birthday', 'date')
    expect(props.value).toBe('2000-01-15')
  })
})

describe('getFieldErrors', () => {
  it('returns undefined when a field has no error', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: 'Theo', email: 'theo@example.com' },
        handler: vi.fn(),
      }),
    )
    expect(result.current.getFieldErrors('name')).toBeUndefined()
  })

  it('returns the error messages after a failed submission', async () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: '', email: '' },
        handler: vi.fn(),
      }),
    )
    await act(async () => {
      await result.current.handleSubmit(makeSubmitEvent())
    })
    expect(result.current.getFieldErrors('name')).toStrictEqual([
      'Name is too short',
    ])
    expect(result.current.getFieldErrors('email')).toStrictEqual([
      'Invalid email',
    ])
  })
})

describe('handleSubmit', () => {
  it('calls preventDefault on the submit event', async () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: 'Theo', email: 'theo@example.com' },
        handler: vi.fn(),
      }),
    )
    const event = makeSubmitEvent()
    await act(async () => {
      await result.current.handleSubmit(event)
    })
    expect(event.preventDefault).toHaveBeenCalledTimes(1)
  })

  it('calls the handler with the parsed values when validation succeeds', async () => {
    const handler = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: 'Theo', email: 'theo@example.com' },
        handler,
      }),
    )
    await act(async () => {
      await result.current.handleSubmit(makeSubmitEvent())
    })
    expect(handler).toHaveBeenCalledWith({
      name: 'Theo',
      email: 'theo@example.com',
    })
  })

  it('does not call the handler when validation fails', async () => {
    const handler = vi.fn()
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: '', email: '' },
        handler,
      }),
    )
    await act(async () => {
      await result.current.handleSubmit(makeSubmitEvent())
    })
    expect(handler).not.toHaveBeenCalled()
  })

  it('sets isSubmitting to true while the handler runs and false after', async () => {
    let resolveHandler: () => void = () => {}
    const handler = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveHandler = resolve
        }),
    )
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: 'Theo', email: 'theo@example.com' },
        handler,
      }),
    )

    let submitPromise!: Promise<void>
    act(() => {
      submitPromise = result.current.handleSubmit(makeSubmitEvent())
    })
    expect(result.current.isSubmitting).toBe(true)

    // Let validation resolve so the handler is actually invoked and
    // resolveHandler gets assigned before we call it.
    await flushMicrotasks()

    await act(async () => {
      resolveHandler()
      await submitPromise
    })
    expect(result.current.isSubmitting).toBe(false)
  })

  it('sets isSubmitting back to false when validation fails', async () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: '', email: '' },
        handler: vi.fn(),
      }),
    )
    await act(async () => {
      await result.current.handleSubmit(makeSubmitEvent())
    })
    expect(result.current.isSubmitting).toBe(false)
  })

  it('clears a previous top-level error when validation succeeds and the handler resolves', async () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: 'Theo', email: 'theo@example.com' },
        handler: vi.fn().mockResolvedValue(undefined),
      }),
    )
    act(() => {
      result.current.setError('Something old')
    })
    expect(result.current.error).toBe('Something old')

    await act(async () => {
      await result.current.handleSubmit(makeSubmitEvent())
    })
    expect(result.current.error).toBeNull()
  })

  it('sets the top-level error to the thrown Error message when the handler rejects', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: 'Theo', email: 'theo@example.com' },
        handler,
      }),
    )
    await act(async () => {
      await result.current.handleSubmit(makeSubmitEvent())
    })
    expect(result.current.error).toBe('Network error')
  })

  it('sets a generic top-level error when the handler rejects with a non-Error value', async () => {
    const handler = vi.fn().mockRejectedValue('nope')
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: 'Theo', email: 'theo@example.com' },
        handler,
      }),
    )
    await act(async () => {
      await result.current.handleSubmit(makeSubmitEvent())
    })
    expect(result.current.error).toBe('Something went wrong')
  })

  it('resets isSubmitting to false even when the handler throws', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: 'Theo', email: 'theo@example.com' },
        handler,
      }),
    )
    await act(async () => {
      await result.current.handleSubmit(makeSubmitEvent())
    })
    expect(result.current.isSubmitting).toBe(false)
  })

  it('validates async refinements before calling the handler', async () => {
    const handler = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() =>
      useZuperForm({
        schema: asyncSchema,
        defaultValues: { username: 'taken' },
        handler,
      }),
    )
    await act(async () => {
      await result.current.handleSubmit(makeSubmitEvent())
    })
    expect(handler).not.toHaveBeenCalled()
    expect(result.current.getFieldErrors('username')).toStrictEqual([
      'Username is taken',
    ])
  })
})

describe('setError', () => {
  it('sets the top-level error when called with a single string', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: '', email: '' },
        handler: vi.fn(),
      }),
    )
    act(() => {
      result.current.setError('Top level error')
    })
    expect(result.current.error).toBe('Top level error')
  })

  it('clears the top-level error when called with null', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: '', email: '' },
        handler: vi.fn(),
      }),
    )
    act(() => {
      result.current.setError('Top level error')
    })
    act(() => {
      result.current.setError(null)
    })
    expect(result.current.error).toBeNull()
  })

  it('sets a field-level error when called with a path and messages', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: 'Theo', email: 'theo@example.com' },
        handler: vi.fn(),
      }),
    )
    act(() => {
      result.current.setError('name', ['Custom error'])
    })
    expect(result.current.getFieldErrors('name')).toStrictEqual([
      'Custom error',
    ])
  })

  it('replaces existing field errors rather than appending', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: 'Theo', email: 'theo@example.com' },
        handler: vi.fn(),
      }),
    )
    act(() => {
      result.current.setError('name', ['First'])
      result.current.setError('name', ['Second'])
    })
    expect(result.current.getFieldErrors('name')).toStrictEqual(['Second'])
  })
})

describe('addFieldError', () => {
  it('adds an error to a field with no existing errors', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: 'Theo', email: 'theo@example.com' },
        handler: vi.fn(),
      }),
    )
    act(() => {
      result.current.addFieldError('name', ['Custom error'])
    })
    expect(result.current.getFieldErrors('name')).toStrictEqual([
      'Custom error',
    ])
  })

  it('appends to existing field errors', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: 'Theo', email: 'theo@example.com' },
        handler: vi.fn(),
      }),
    )
    act(() => {
      result.current.setError('name', ['First'])
    })
    act(() => {
      result.current.addFieldError('name', ['Second'])
    })
    expect(result.current.getFieldErrors('name')).toStrictEqual([
      'First',
      'Second',
    ])
  })
})

describe('clearError', () => {
  it('clears a single field error when a path is provided', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: 'Theo', email: 'theo@example.com' },
        handler: vi.fn(),
      }),
    )
    act(() => {
      result.current.setError('name', ['Custom error'])
    })
    act(() => {
      result.current.clearError('name')
    })
    expect(result.current.getFieldErrors('name')).toBeUndefined()
  })

  it('clears all field errors when no path is provided', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: 'Theo', email: 'theo@example.com' },
        handler: vi.fn(),
      }),
    )
    act(() => {
      result.current.setError('name', ['A'])
      result.current.setError('email', ['B'])
    })
    act(() => {
      result.current.clearError()
    })
    expect(result.current.getFieldErrors('name')).toBeUndefined()
    expect(result.current.getFieldErrors('email')).toBeUndefined()
  })

  it('does not clear the top-level error', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: 'Theo', email: 'theo@example.com' },
        handler: vi.fn(),
      }),
    )
    act(() => {
      result.current.setError('Top level')
    })
    act(() => {
      result.current.clearError()
    })
    expect(result.current.error).toBe('Top level')
  })
})

describe('reset', () => {
  it('restores default values with no arguments', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: 'Theo', email: 'theo@example.com' },
        handler: vi.fn(),
      }),
    )
    act(() => {
      result.current.setValue('name', 'Other')
    })
    act(() => {
      result.current.reset()
    })
    expect(result.current.watch('name')).toBe('Theo')
  })

  it('resets to provided values when given', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: 'Theo', email: 'theo@example.com' },
        handler: vi.fn(),
      }),
    )
    act(() => {
      result.current.reset({ name: 'New', email: 'new@example.com' })
    })
    expect(result.current.watch()).toEqual({
      name: 'New',
      email: 'new@example.com',
    })
  })

  it('clears errors on reset', async () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: '', email: '' },
        handler: vi.fn(),
      }),
    )
    await act(async () => {
      await result.current.handleSubmit(makeSubmitEvent())
    })
    expect(result.current.getFieldErrors('name')).toBeDefined()

    act(() => {
      result.current.reset()
    })
    expect(result.current.getFieldErrors('name')).toBeUndefined()
  })

  it('clears touched state on reset', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: '', email: '' },
        handler: vi.fn(),
      }),
    )
    act(() => {
      result.current.bind('name', 'text').onBlur()
    })
    expect(result.current.touchedFields.name).toBe(true)

    act(() => {
      result.current.reset()
    })
    expect(result.current.touchedFields.name).toBeUndefined()
  })

  it('clears the stale raw value cache so bound inputs reflect the reset value', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema: numberSchema,
        defaultValues: { age: 10 },
        handler: vi.fn(),
      }),
    )
    act(() => {
      result.current.bind('age', 'number').onChange(makeChangeEvent('20'))
    })
    expect(result.current.bind('age', 'number').value).toBe('20')

    act(() => {
      result.current.reset()
    })
    expect(result.current.bind('age', 'number').value).toBe('10')
  })
})

describe('resetField', () => {
  it('resets a single field to its default value', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: 'Theo', email: 'theo@example.com' },
        handler: vi.fn(),
      }),
    )
    act(() => {
      result.current.setValue('name', 'Other')
    })
    act(() => {
      result.current.resetField('name')
    })
    expect(result.current.watch('name')).toBe('Theo')
  })

  it('does not affect other fields', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: 'Theo', email: 'theo@example.com' },
        handler: vi.fn(),
      }),
    )
    act(() => {
      result.current.setValue('name', 'Other')
      result.current.setValue('email', 'other@example.com')
    })
    act(() => {
      result.current.resetField('name')
    })
    expect(result.current.watch('email')).toBe('other@example.com')
  })

  it('resets to a provided value when given', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: 'Theo', email: 'theo@example.com' },
        handler: vi.fn(),
      }),
    )
    act(() => {
      result.current.resetField('name', 'Specific')
    })
    expect(result.current.watch('name')).toBe('Specific')
  })

  it('clears the error for that field', async () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: '', email: 'theo@example.com' },
        handler: vi.fn(),
      }),
    )
    await act(async () => {
      await result.current.handleSubmit(makeSubmitEvent())
    })
    expect(result.current.getFieldErrors('name')).toBeDefined()

    act(() => {
      result.current.resetField('name')
    })
    expect(result.current.getFieldErrors('name')).toBeUndefined()
  })

  it('clears the touched state for that field', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: '', email: '' },
        handler: vi.fn(),
      }),
    )
    act(() => {
      result.current.bind('name', 'text').onBlur()
    })
    act(() => {
      result.current.resetField('name')
    })
    expect(result.current.touchedFields.name).toBeUndefined()
  })

  it('clears the stale raw value cache for that field', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema: numberSchema,
        defaultValues: { age: 10 },
        handler: vi.fn(),
      }),
    )
    act(() => {
      result.current.bind('age', 'number').onChange(makeChangeEvent('20'))
    })
    act(() => {
      result.current.resetField('age')
    })
    expect(result.current.bind('age', 'number').value).toBe('10')
  })
})

describe('setValue', () => {
  it('updates a top-level field', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: '', email: '' },
        handler: vi.fn(),
      }),
    )
    act(() => {
      result.current.setValue('name', 'Theo')
    })
    expect(result.current.watch('name')).toBe('Theo')
  })

  it('updates a nested field', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema: nestedSchema,
        defaultValues: { address: { street: '', city: '' } },
        handler: vi.fn(),
      }),
    )
    act(() => {
      result.current.setValue('address.street', 'Main St')
    })
    expect(result.current.watch('address.street')).toBe('Main St')
  })

  it('clears any cached raw value for the field so bind() reflects the new value', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema: numberSchema,
        defaultValues: { age: 0 },
        handler: vi.fn(),
      }),
    )
    act(() => {
      result.current.bind('age', 'number').onChange(makeChangeEvent('5'))
    })
    expect(result.current.bind('age', 'number').value).toBe('5')

    act(() => {
      result.current.setValue('age', 99)
    })
    expect(result.current.bind('age', 'number').value).toBe('99')
  })
})

describe('dirtyFields / isDirty', () => {
  it('marks a field dirty after it changes from its default', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: 'Theo', email: 'theo@example.com' },
        handler: vi.fn(),
      }),
    )
    act(() => {
      result.current.setValue('name', 'Other')
    })
    expect(result.current.dirtyFields.name).toBe(true)
    expect(result.current.isDirty).toBe(true)
  })

  it('does not mark unrelated fields dirty', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: 'Theo', email: 'theo@example.com' },
        handler: vi.fn(),
      }),
    )
    act(() => {
      result.current.setValue('name', 'Other')
    })
    expect(result.current.dirtyFields.email).toBeUndefined()
  })

  it('is not dirty again once a field is set back to its default value', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: 'Theo', email: 'theo@example.com' },
        handler: vi.fn(),
      }),
    )
    act(() => {
      result.current.setValue('name', 'Other')
    })
    act(() => {
      result.current.setValue('name', 'Theo')
    })
    expect(result.current.dirtyFields.name).toBeUndefined()
    expect(result.current.isDirty).toBe(false)
  })

  it('tracks dirty state for nested fields individually', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema: nestedSchema,
        defaultValues: { address: { street: 'Main St', city: 'Malmö' } },
        handler: vi.fn(),
      }),
    )
    act(() => {
      result.current.setValue('address.street', 'Other St')
    })
    expect(result.current.dirtyFields['address.street']).toBe(true)
    expect(result.current.dirtyFields['address.city']).toBeUndefined()
  })
})

describe('_internal', () => {
  it('exposes subscribe, getSnapshot, and setValue for useFieldArray', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: '', email: '' },
        handler: vi.fn(),
      }),
    )
    expect(typeof result.current._internal.subscribe).toBe('function')
    expect(typeof result.current._internal.getSnapshot).toBe('function')
    expect(typeof result.current._internal.setValue).toBe('function')
  })

  it('setValue on _internal updates the underlying store', () => {
    const { result } = renderHook(() =>
      useZuperForm({
        schema,
        defaultValues: { name: '', email: '' },
        handler: vi.fn(),
      }),
    )
    act(() => {
      result.current._internal.setValue('name', 'Theo')
    })
    expect(result.current.watch('name')).toBe('Theo')
  })
})
