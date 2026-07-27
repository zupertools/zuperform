![zuperform](https://raw.githubusercontent.com/zupertools/zuperform/refs/heads/main/assets/banner.png?raw=true)

# zuperform (core)

The framework-agnostic core of zuperform. It handles form state, validation, dirty/touched tracking, and dot-path field access. It has no UI framework dependency, only Zod.

## What's in here

- **`createFormStore(schema, defaultValues)`** - creates a reactive store that holds form values, errors, and touched state. The store uses a subscribe/snapshot pattern compatible with `useSyncExternalStore` and similar primitives in other frameworks.
- **`validateAll(schema, values)`** - runs `safeParseAsync` and returns both the result and a flat `Record<string, string>` of errors keyed by dot-path.
- **`validateField(schema, values, path)`** - extracts the field's own schema and parses just that value, so async refinements on other fields don't block it.
- **`getSchemaAtPath(schema, path)`** - traverses a Zod schema by dot-path and returns the schema at that location, unwrapping `optional`, `nullable`, and `default` wrappers along the way.
- **`coerceToSchema(schema, rawValue)`** - coerces a raw DOM string value to the type the schema expects. Handles `z.number()` and `z.boolean()`.
- **`getIn(obj, path)`** / **`setIn(obj, path, value)`** - immutable dot-path read and write helpers.
- **`flattenPaths(obj)`** - returns all leaf paths in a nested object as a flat array of dot-path strings.
- **`deepEqual(a, b)`** - structural equality check used internally for dirty tracking.
- **`getAsyncFields(schema)`** - walks a Zod object schema and returns a `Set<string>` of field paths that have async refinements anywhere in their schema tree. Used by the React adapter to automatically debounce only the fields that need it.

## Building an adapter

The main thing you need is `createFormStore`. It returns a `FormStore` object:

```ts
import { createFormStore } from '@zupertools/form-core'

const store = createFormStore(schema, defaultValues)

// Read state
store.getSnapshot()   // { values, errors, touched }
store.getErrors()
store.getValues()
store.getValue(path)
store.isDirty(path)
store.isTouched(path)

// Write state
store.setValue(path, value)
store.touch(path)
store.reset(nextValues?)
store.resetField(path, nextValue?)

// Validation
store.validate()            // full async parse, returns ZodSafeParseResult
store.validateField(path)   // async, returns error message or undefined
store.addFieldError(path, message)
store.clearFieldErrors(path)

// Subscribe to changes (compatible with useSyncExternalStore or similar)
const unsubscribe = store.subscribe(() => {
  const { values, errors, touched } = store.getSnapshot()
})
```

## License

MIT
