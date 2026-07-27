import z from 'zod'
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useZuperForm } from '../useZuperForm'
import { useFieldArray } from '../useFieldArray'

const schema = z.object({
  tags: z.array(z.string()),
  items: z.array(z.object({ name: z.string(), qty: z.number() })),
})

const defaultValues = {
  tags: ['alpha', 'beta'],
  items: [
    { name: 'Widget', qty: 1 },
    { name: 'Gadget', qty: 2 },
  ],
}

function setupTags(initial = ['alpha', 'beta']) {
  const form = renderHook(() =>
    useZuperForm({
      schema,
      defaultValues: { ...defaultValues, tags: initial },
      handler: vi.fn(),
    }),
  )
  const array = renderHook(() =>
    useFieldArray(form.result.current._internal, 'tags'),
  )
  return { form, array }
}

function setupItems(
  initial = [
    { name: 'Widget', qty: 1 },
    { name: 'Gadget', qty: 2 },
  ],
) {
  const form = renderHook(() =>
    useZuperForm({
      schema,
      defaultValues: { ...defaultValues, items: initial },
      handler: vi.fn(),
    }),
  )
  const array = renderHook(() =>
    useFieldArray(form.result.current._internal, 'items'),
  )
  return { form, array }
}

describe('initial state', () => {
  it('exposes the initial items via fields', () => {
    const { array } = setupTags()
    expect(array.result.current.fields.map((f) => f.item)).toEqual([
      'alpha',
      'beta',
    ])
  })

  it('assigns an id to each field', () => {
    const { array } = setupTags()
    expect(array.result.current.fields[0].id).toBe('tags-0')
    expect(array.result.current.fields[1].id).toBe('tags-1')
  })

  it('assigns the correct index to each field', () => {
    const { array } = setupTags()
    expect(array.result.current.fields[0].index).toBe(0)
    expect(array.result.current.fields[1].index).toBe(1)
  })

  it('starts empty when defaultValues has an empty array', () => {
    const { array } = setupTags([])
    expect(array.result.current.fields).toHaveLength(0)
  })

  it('works with object array items', () => {
    const { array } = setupItems()
    expect(array.result.current.fields[0].item).toEqual({
      name: 'Widget',
      qty: 1,
    })
    expect(array.result.current.fields[1].item).toEqual({
      name: 'Gadget',
      qty: 2,
    })
  })
})

describe('append', () => {
  it('adds an item to the end of the list', () => {
    const { array } = setupTags()
    act(() => array.result.current.append('gamma'))
    expect(array.result.current.fields.map((f) => f.item)).toEqual([
      'alpha',
      'beta',
      'gamma',
    ])
  })

  it('does not affect existing items when appending', () => {
    const { array } = setupTags()
    act(() => array.result.current.append('gamma'))
    expect(array.result.current.fields[0].item).toBe('alpha')
    expect(array.result.current.fields[1].item).toBe('beta')
  })

  it('increments the length by one', () => {
    const { array } = setupTags()
    act(() => array.result.current.append('gamma'))
    expect(array.result.current.fields).toHaveLength(3)
  })

  it('can append multiple times in sequence', () => {
    const { array } = setupTags([])
    act(() => array.result.current.append('first'))
    act(() => array.result.current.append('second'))
    expect(array.result.current.fields.map((f) => f.item)).toEqual([
      'first',
      'second',
    ])
  })

  it('works with object items', () => {
    const { array } = setupItems([])
    act(() => array.result.current.append({ name: 'New', qty: 5 }))
    expect(array.result.current.fields[0].item).toEqual({ name: 'New', qty: 5 })
  })

  it('assigns a correct id to the new item', () => {
    const { array } = setupTags()
    act(() => array.result.current.append('gamma'))
    expect(array.result.current.fields[2].id).toBe('tags-2')
  })
})

describe('remove', () => {
  it('removes the item at the given index', () => {
    const { array } = setupTags()
    act(() => array.result.current.remove(0))
    expect(array.result.current.fields.map((f) => f.item)).toEqual(['beta'])
  })

  it('removes the last item correctly', () => {
    const { array } = setupTags()
    act(() => array.result.current.remove(1))
    expect(array.result.current.fields.map((f) => f.item)).toEqual(['alpha'])
  })

  it('decrements the length by one', () => {
    const { array } = setupTags()
    act(() => array.result.current.remove(0))
    expect(array.result.current.fields).toHaveLength(1)
  })

  it('does not affect other items when removing from the middle', () => {
    const { array } = setupTags(['alpha', 'beta', 'gamma'])
    act(() => array.result.current.remove(1))
    expect(array.result.current.fields.map((f) => f.item)).toEqual([
      'alpha',
      'gamma',
    ])
  })

  it('results in an empty array when the only item is removed', () => {
    const { array } = setupTags(['only'])
    act(() => array.result.current.remove(0))
    expect(array.result.current.fields).toHaveLength(0)
  })

  it('works with object items', () => {
    const { array } = setupItems()
    act(() => array.result.current.remove(0))
    expect(array.result.current.fields[0].item).toEqual({
      name: 'Gadget',
      qty: 2,
    })
  })
})

describe('move', () => {
  it('moves an item from one index to another', () => {
    const { array } = setupTags(['alpha', 'beta', 'gamma'])
    act(() => array.result.current.move(0, 2))
    expect(array.result.current.fields.map((f) => f.item)).toEqual([
      'beta',
      'gamma',
      'alpha',
    ])
  })

  it('moves an item backwards', () => {
    const { array } = setupTags(['alpha', 'beta', 'gamma'])
    act(() => array.result.current.move(2, 0))
    expect(array.result.current.fields.map((f) => f.item)).toEqual([
      'gamma',
      'alpha',
      'beta',
    ])
  })

  it('swaps two adjacent items', () => {
    const { array } = setupTags()
    act(() => array.result.current.move(0, 1))
    expect(array.result.current.fields.map((f) => f.item)).toEqual([
      'beta',
      'alpha',
    ])
  })

  it('keeps the length unchanged after a move', () => {
    const { array } = setupTags(['alpha', 'beta', 'gamma'])
    act(() => array.result.current.move(0, 2))
    expect(array.result.current.fields).toHaveLength(3)
  })

  it('does not affect items not involved in the move', () => {
    const { array } = setupTags(['alpha', 'beta', 'gamma', 'delta'])
    act(() => array.result.current.move(0, 2))
    // alpha moves to 2, beta->0, gamma->1, delta stays at 3
    expect(array.result.current.fields[3].item).toBe('delta')
  })

  it('works with object items', () => {
    const { array } = setupItems()
    act(() => array.result.current.move(0, 1))
    expect(array.result.current.fields[0].item).toEqual({
      name: 'Gadget',
      qty: 2,
    })
    expect(array.result.current.fields[1].item).toEqual({
      name: 'Widget',
      qty: 1,
    })
  })
})

describe('reactivity', () => {
  it('reflects mutations made through a second hook instance on the same field', () => {
    const { form, array } = setupTags(['x', 'y'])
    // A second hook wired to the same store (simulates two components using the same array)
    const second = renderHook(() =>
      useFieldArray(form.result.current._internal, 'tags'),
    )
    act(() => second.result.current.append('z'))
    expect(array.result.current.fields.map((f) => f.item)).toEqual([
      'x',
      'y',
      'z',
    ])
  })

  it('re-indexes ids after a remove', () => {
    const { array } = setupTags(['alpha', 'beta', 'gamma'])
    act(() => array.result.current.remove(0))
    // After remove the remaining items are re-indexed by their new position
    expect(array.result.current.fields[0].id).toBe('tags-0')
    expect(array.result.current.fields[1].id).toBe('tags-1')
  })
})
