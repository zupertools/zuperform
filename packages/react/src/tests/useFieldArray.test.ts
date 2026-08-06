import z from 'zod'
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useZuperForm } from '../useZuperForm'
import { useFieldArray } from '../useFieldArray'

const schema = z.object({
  tags: z.array(z.string()),
  items: z.array(
    z.object({
      name: z.string(),
      qty: z.number(),
    }),
  ),
})

function useFormWithArray() {
  const form = useZuperForm({
    schema,
    defaultValues: {
      tags: ['a', 'b', 'c'],
      items: [
        { name: 'Widget', qty: 1 },
        { name: 'Gadget', qty: 2 },
      ],
    },
    handler: vi.fn(),
  })
  const tagsArray = useFieldArray<string>(form._internal, 'tags')
  const itemsArray = useFieldArray<{ name: string; qty: number }>(
    form._internal,
    'items',
  )
  return { form, tagsArray, itemsArray }
}

describe('initial state', () => {
  it('exposes one field per item in the array', () => {
    const { result } = renderHook(() => useFormWithArray())
    expect(result.current.tagsArray.fields).toHaveLength(3)
  })

  it('exposes the underlying item value on each field', () => {
    const { result } = renderHook(() => useFormWithArray())
    expect(result.current.tagsArray.fields.map((f) => f.item)).toEqual([
      'a',
      'b',
      'c',
    ])
  })

  it('exposes the correct index on each field', () => {
    const { result } = renderHook(() => useFormWithArray())
    expect(result.current.tagsArray.fields.map((f) => f.index)).toEqual([
      0, 1, 2,
    ])
  })

  it('generates a stable, unique id per field based on name and index', () => {
    const { result } = renderHook(() => useFormWithArray())
    const ids = result.current.tagsArray.fields.map((f) => f.id)
    expect(ids).toEqual(['tags-0', 'tags-1', 'tags-2'])
  })

  it('returns an empty fields array when the underlying path is undefined', () => {
    const { result } = renderHook(() => {
      const form = useZuperForm({
        schema,
        defaultValues: { tags: [], items: [] },
        handler: vi.fn(),
      })
      return useFieldArray<string>(form._internal, 'missing.path')
    })
    expect(result.current.fields).toEqual([])
  })

  it('returns an empty fields array for an empty array field', () => {
    const { result } = renderHook(() => {
      const form = useZuperForm({
        schema,
        defaultValues: { tags: [], items: [] },
        handler: vi.fn(),
      })
      return useFieldArray<string>(form._internal, 'tags')
    })
    expect(result.current.fields).toEqual([])
  })

  it('works with arrays of objects', () => {
    const { result } = renderHook(() => useFormWithArray())
    expect(result.current.itemsArray.fields.map((f) => f.item)).toEqual([
      { name: 'Widget', qty: 1 },
      { name: 'Gadget', qty: 2 },
    ])
  })
})

describe('append', () => {
  it('adds a new item to the end of the array', () => {
    const { result } = renderHook(() => useFormWithArray())
    act(() => {
      result.current.tagsArray.append('d')
    })
    expect(result.current.tagsArray.fields.map((f) => f.item)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ])
  })

  it('increases the field count by one', () => {
    const { result } = renderHook(() => useFormWithArray())
    act(() => {
      result.current.tagsArray.append('d')
    })
    expect(result.current.tagsArray.fields).toHaveLength(4)
  })

  it('does not affect other fields on the form', () => {
    const { result } = renderHook(() => useFormWithArray())
    act(() => {
      result.current.tagsArray.append('d')
    })
    expect(result.current.form.watch('items')).toEqual([
      { name: 'Widget', qty: 1 },
      { name: 'Gadget', qty: 2 },
    ])
  })

  it('appends an object item to an object array', () => {
    const { result } = renderHook(() => useFormWithArray())
    act(() => {
      result.current.itemsArray.append({ name: 'Sprocket', qty: 3 })
    })
    expect(result.current.itemsArray.fields.map((f) => f.item)).toEqual([
      { name: 'Widget', qty: 1 },
      { name: 'Gadget', qty: 2 },
      { name: 'Sprocket', qty: 3 },
    ])
  })

  it('appends to an initially empty array', () => {
    const { result } = renderHook(() => {
      const form = useZuperForm({
        schema,
        defaultValues: { tags: [], items: [] },
        handler: vi.fn(),
      })
      return useFieldArray<string>(form._internal, 'tags')
    })
    act(() => {
      result.current.append('first')
    })
    expect(result.current.fields.map((f) => f.item)).toEqual(['first'])
  })

  it('supports multiple sequential appends', () => {
    const { result } = renderHook(() => useFormWithArray())
    act(() => {
      result.current.tagsArray.append('d')
    })
    act(() => {
      result.current.tagsArray.append('e')
    })
    expect(result.current.tagsArray.fields.map((f) => f.item)).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
    ])
  })
})

describe('remove', () => {
  it('removes the item at the given index', () => {
    const { result } = renderHook(() => useFormWithArray())
    act(() => {
      result.current.tagsArray.remove(1)
    })
    expect(result.current.tagsArray.fields.map((f) => f.item)).toEqual([
      'a',
      'c',
    ])
  })

  it('decreases the field count by one', () => {
    const { result } = renderHook(() => useFormWithArray())
    act(() => {
      result.current.tagsArray.remove(0)
    })
    expect(result.current.tagsArray.fields).toHaveLength(2)
  })

  it('re-indexes remaining fields after removal', () => {
    const { result } = renderHook(() => useFormWithArray())
    act(() => {
      result.current.tagsArray.remove(0)
    })
    expect(result.current.tagsArray.fields.map((f) => f.index)).toEqual([0, 1])
  })

  it('removes the first item correctly', () => {
    const { result } = renderHook(() => useFormWithArray())
    act(() => {
      result.current.tagsArray.remove(0)
    })
    expect(result.current.tagsArray.fields.map((f) => f.item)).toEqual([
      'b',
      'c',
    ])
  })

  it('removes the last item correctly', () => {
    const { result } = renderHook(() => useFormWithArray())
    act(() => {
      result.current.tagsArray.remove(2)
    })
    expect(result.current.tagsArray.fields.map((f) => f.item)).toEqual([
      'a',
      'b',
    ])
  })

  it('does nothing observable when removing an out-of-bounds index', () => {
    const { result } = renderHook(() => useFormWithArray())
    act(() => {
      result.current.tagsArray.remove(99)
    })
    expect(result.current.tagsArray.fields.map((f) => f.item)).toEqual([
      'a',
      'b',
      'c',
    ])
  })

  it('removes an object item from an object array', () => {
    const { result } = renderHook(() => useFormWithArray())
    act(() => {
      result.current.itemsArray.remove(0)
    })
    expect(result.current.itemsArray.fields.map((f) => f.item)).toEqual([
      { name: 'Gadget', qty: 2 },
    ])
  })

  it('results in an empty array when removing the only item', () => {
    const { result } = renderHook(() => {
      const form = useZuperForm({
        schema,
        defaultValues: { tags: ['only'], items: [] },
        handler: vi.fn(),
      })
      return useFieldArray<string>(form._internal, 'tags')
    })
    act(() => {
      result.current.remove(0)
    })
    expect(result.current.fields).toEqual([])
  })
})

describe('move', () => {
  it('moves an item forward in the array', () => {
    const { result } = renderHook(() => useFormWithArray())
    act(() => {
      result.current.tagsArray.move(0, 2)
    })
    expect(result.current.tagsArray.fields.map((f) => f.item)).toEqual([
      'b',
      'c',
      'a',
    ])
  })

  it('moves an item backward in the array', () => {
    const { result } = renderHook(() => useFormWithArray())
    act(() => {
      result.current.tagsArray.move(2, 0)
    })
    expect(result.current.tagsArray.fields.map((f) => f.item)).toEqual([
      'c',
      'a',
      'b',
    ])
  })

  it('keeps the array length unchanged', () => {
    const { result } = renderHook(() => useFormWithArray())
    act(() => {
      result.current.tagsArray.move(0, 2)
    })
    expect(result.current.tagsArray.fields).toHaveLength(3)
  })

  it('does nothing when moving an item to its own position', () => {
    const { result } = renderHook(() => useFormWithArray())
    act(() => {
      result.current.tagsArray.move(1, 1)
    })
    expect(result.current.tagsArray.fields.map((f) => f.item)).toEqual([
      'a',
      'b',
      'c',
    ])
  })

  it('re-indexes fields after a move', () => {
    const { result } = renderHook(() => useFormWithArray())
    act(() => {
      result.current.tagsArray.move(0, 2)
    })
    expect(result.current.tagsArray.fields.map((f) => f.index)).toEqual([
      0, 1, 2,
    ])
  })

  it('moves object items in an object array', () => {
    const { result } = renderHook(() => useFormWithArray())
    act(() => {
      result.current.itemsArray.move(0, 1)
    })
    expect(result.current.itemsArray.fields.map((f) => f.item)).toEqual([
      { name: 'Gadget', qty: 2 },
      { name: 'Widget', qty: 1 },
    ])
  })
})

describe('reactivity', () => {
  it('reflects updates to array items made directly through the form', () => {
    const { result } = renderHook(() => useFormWithArray())
    act(() => {
      result.current.form.setValue('items.0.qty', 42)
    })
    expect(result.current.itemsArray.fields[0].item).toEqual({
      name: 'Widget',
      qty: 42,
    })
  })

  it('reflects a full array replacement made directly through the form', () => {
    const { result } = renderHook(() => useFormWithArray())
    act(() => {
      result.current.form.setValue('tags', ['x', 'y'])
    })
    expect(result.current.tagsArray.fields.map((f) => f.item)).toEqual([
      'x',
      'y',
    ])
  })

  it('resets to empty when the form is reset with an empty array', () => {
    const { result } = renderHook(() => useFormWithArray())
    act(() => {
      result.current.form.reset({ tags: [], items: [] })
    })
    expect(result.current.tagsArray.fields).toEqual([])
    expect(result.current.itemsArray.fields).toEqual([])
  })

  it('two independent useFieldArray calls for different fields stay isolated', () => {
    const { result } = renderHook(() => useFormWithArray())
    act(() => {
      result.current.tagsArray.append('d')
    })
    expect(result.current.itemsArray.fields).toHaveLength(2)
  })
})
