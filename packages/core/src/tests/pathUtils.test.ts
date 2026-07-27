import { describe, it, expect } from 'vitest'
import { getIn, setIn, flattenPaths } from '../pathUtils'

describe('getIn', () => {
  it('reads a top-level string value', () => {
    expect(getIn({ name: 'Theo' }, 'name')).toBe('Theo')
  })

  it('reads a top-level number value', () => {
    expect(getIn({ age: 30 }, 'age')).toBe(30)
  })

  it('reads a two-level nested value', () => {
    expect(getIn({ address: { street: 'Main St' } }, 'address.street')).toBe(
      'Main St',
    )
  })

  it('reads a three-level nested value', () => {
    expect(
      getIn({ user: { address: { city: 'Malmö' } } }, 'user.address.city'),
    ).toBe('Malmö')
  })

  it('returns undefined for a missing top-level key', () => {
    expect(getIn({ name: 'Theo' }, 'email')).toBeUndefined()
  })

  it('returns undefined for a missing nested key', () => {
    expect(getIn({ address: {} }, 'address.street')).toBeUndefined()
  })

  it('returns undefined when an intermediate segment is missing', () => {
    expect(getIn({}, 'a.b.c')).toBeUndefined()
  })

  it('reads an array element by numeric index', () => {
    expect(getIn({ items: ['a', 'b', 'c'] }, 'items.1')).toBe('b')
  })

  it('reads a field inside an array element', () => {
    expect(getIn({ items: [{ qty: 1 }, { qty: 2 }] }, 'items.1.qty')).toBe(2)
  })

  it('returns undefined for an out-of-bounds array index', () => {
    expect(getIn({ items: [1, 2] }, 'items.5')).toBeUndefined()
  })
})

describe('setIn', () => {
  it('sets a top-level value', () => {
    const result = setIn({ name: 'Theo' }, 'name', 'New Name')
    expect(result.name).toBe('New Name')
  })

  it('does not mutate the original object at the top level', () => {
    const original = { name: 'Theo' }
    setIn(original, 'name', 'New Name')
    expect(original.name).toBe('Theo')
  })

  it('sets a nested value two levels deep', () => {
    const result = setIn(
      { address: { street: 'Old St' } },
      'address.street',
      'New St',
    )
    expect(result.address.street).toBe('New St')
  })

  it('does not mutate the original object at nested levels', () => {
    const original = { address: { street: 'Old St' } }
    setIn(original, 'address.street', 'New St')
    expect(original.address.street).toBe('Old St')
  })

  it('preserves sibling keys at the same nesting level', () => {
    const original = { address: { street: 'Main St', city: 'Malmö' } }
    const result = setIn(original, 'address.street', 'New St')
    expect(result.address.city).toBe('Malmö')
  })

  it('preserves sibling keys at the top level', () => {
    const original = { name: 'Theo', age: 30 }
    const result = setIn(original, 'name', 'Other')
    expect(result.age).toBe(30)
  })

  it('creates intermediate objects when the path does not exist', () => {
    const result = setIn({} as { a?: { b?: { c?: number } } }, 'a.b.c', 42)
    expect((result as { a: { b: { c: number } } }).a.b.c).toBe(42)
  })

  it('writes a value at a numeric array index', () => {
    const original = { items: [{ qty: 1 }, { qty: 2 }] }
    const result = setIn(original, 'items.1.qty', 99)
    expect(result.items[1].qty).toBe(99)
  })

  it('does not affect other array elements when writing by index', () => {
    const original = { items: [{ qty: 1 }, { qty: 2 }] }
    const result = setIn(original, 'items.1.qty', 99)
    expect(result.items[0].qty).toBe(1)
  })
})

describe('flattenPaths', () => {
  it('returns top-level keys for a flat object', () => {
    expect(flattenPaths({ name: 'Theo', age: 30 })).toEqual(['name', 'age'])
  })

  it('returns dot-separated paths for nested objects', () => {
    expect(
      flattenPaths({ address: { street: 'Main St', city: 'Malmö' } }),
    ).toEqual(['address.street', 'address.city'])
  })

  it('returns indexed paths for a primitive array', () => {
    expect(flattenPaths({ tags: ['a', 'b'] })).toEqual(['tags.0', 'tags.1'])
  })

  it('returns indexed + field paths for an object array', () => {
    expect(flattenPaths({ items: [{ qty: 1 }, { qty: 2 }] })).toEqual([
      'items.0.qty',
      'items.1.qty',
    ])
  })

  it('handles a mix of flat, nested, and array fields', () => {
    const paths = flattenPaths({
      name: 'Theo',
      address: { city: 'Malmö' },
      tags: ['x'],
    })
    expect(paths).toEqual(['name', 'address.city', 'tags.0'])
  })

  it('returns an empty array for an empty object', () => {
    expect(flattenPaths({})).toEqual([])
  })

  it('prepends a prefix when provided', () => {
    expect(flattenPaths({ street: 'Main St' }, 'address')).toEqual([
      'address.street',
    ])
  })
})
