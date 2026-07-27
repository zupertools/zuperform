![zuperform](https://raw.githubusercontent.com/zupertools/zuperform/refs/heads/main/assets/banner.png?raw=true)

# zuperform (React)

A React form library built around Zod schemas. You describe your data shape once, and zuperform handles binding, validation, error state, dirty/touched tracking, and submission, all typed end-to-end from your schema.

```tsx
const schema = z.object({
  name: z.string().min(2, "Name is too short"),
  email: z.email("Invalid email"),
});

function SignupForm() {
  const { bind, getFieldErrors, handleSubmit, isSubmitting, error } =
    useZuperForm({
      schema,
      defaultValues: { name: "", email: "" },
      handler: async (values) => {
        await api.signup(values);
      },
    });

  return (
    <form onSubmit={handleSubmit}>
      <input {...bind("name")} />
      <span>{getFieldErrors("name")[0]}</span>

      <input {...bind("email")} />
      <span>{getFieldErrors("email")[0]}</span>

      <button type="submit" disabled={isSubmitting}>
        Submit
      </button>
      {error && <span>{error}</span>}
    </form>
  );
}
```

## Features

- **Schema-driven by default** - pass a Zod schema and `defaultValues`, and the form state, validation, and types all derive from it automatically
- **Full TypeScript inference** - field paths in `bind()`, `getFieldErrors()`, and `watch()` are typed against your schema
- **Flexible validation timing** - `mode` controls when a field is first validated (`onSubmit`, `onBlur`, or `onChange`), `reValidateMode` controls how it behaves once an error is already showing
- **Nested objects and arrays** - dot-path syntax (`address.street`, `items.0.qty`) works throughout, and `useFieldArray` adds `append`, `remove`, and `move` for dynamic lists
- **Automatic input coercion** - `z.number()` fields gets coerced from the DOM's string value automatically, so values.age is a real number, not `"42"`
- **Server-side/custom error integration** - `setError('field', 'message')` or `setError('top-level message')` feeds server responses or custom errors back into the same error state the form already tracks
- **Async validation** - schemas with `.refine(async ...)` work without any extra config and automatically debounce
- **Dirty and touched tracking** - `isDirty`, `dirtyFields`, and `touchedFields` are derived from a deep comparison against the original `defaultValues`

## Installation

```bash
npm install @zupertools/form-react
```

## Core concepts

### The hook

```tsx
const {
  bind, // spreadable props for an input/textarea/select
  getFieldErrors, // (path) => string[] | undefined
  handleSubmit, // form onSubmit handler
  isSubmitting, // true while your handler is running
  error, // top-level error string, if any
  setError, // set a field or top-level error manually
  reset, // reset to defaults, or to new values
  resetField, // reset a single field to default, or to a new value
  setValue, // set a field value manually
  watch, // read a field (or the whole form) reactively
  isDirty,
  dirtyFields,
  touchedFields,
} = useZuperForm({
  schema,
  defaultValues,
  handler: async (values) => {
    /* values is fully typed & already validated */
  },
  mode: "onSubmit", // when to run the first validation pass per field
  reValidateMode: "onChange", // once a field has an error, how it re-checks
  asyncDebounceMs: 300, // debounce time for async validation on onChange
});
```

`values` passed into `handler` are the parsed output of `schema.safeParse`, not the raw form state, so if your schema transforms or refines data, `handler` sees the transformed result.

### Binding fields

`bind` works the same way regardless of nesting or element type:

```tsx
<input {...bind('name')} />
<textarea {...bind('bio')} />
<select {...bind('country')}>...</select>
<input type="checkbox" {...bind('acceptTerms')} />
```

Checkbox handling is automatic: `bind` detects a `z.boolean()` field at that path and returns `checked` instead of `value`.

### Nested and array fields

```ts
const schema = z.object({
  address: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
  }),
  items: z.array(z.object({ qty: z.number().min(1) })),
});
```

```tsx
<input {...bind('address.street')} />
<span>{getFieldErrors('address.street')[0]}</span> // render the topmost error
// or
{getFieldErrors('address.street').map((e) => <span key={e}>{e}</span>)} // render all errors
```

For arrays, pair `bind` with `useFieldArray`:

```tsx
const form = useZuperForm({ schema, defaultValues, handler });
const { fields, append, remove } = useFieldArray(form._internal, "items");

{
  fields.map((f) => (
    <div key={f.id}>
      <input {...form.bind(`items.${f.index}.qty`)} type="number" />
      <span>{form.getFieldErrors(`items.${f.index}.qty`)[0]}</span>
      <button type="button" onClick={() => remove(f.index)}>
        Remove
      </button>
    </div>
  ));
}
<button type="button" onClick={() => append({ qty: 1 })}>
  Add item
</button>;
```

### Validation timing

```ts
useZuperForm({
  schema,
  defaultValues,
  handler,
  mode: "onBlur", // validate a field the first time it's blurred
  reValidateMode: "onChange", // after that, clear/update the error on every keystroke
});
```

`mode` controls when a field is _first_ validated (`onSubmit`, `onBlur`, or `onChange`). `reValidateMode` controls what happens on every interaction _after_ a field already has an error. This lets a field stay quiet while the user is still typing their first pass, but respond immediately once something's flagged as wrong.

Validation is async throughout, so schemas with `.refine(async ...)` work without any extra config. zuperform scans the schema on mount and automatically debounces `onChange` validation only for fields that have async refinements. The debounce defaults to 300ms and can be adjusted with `asyncDebounceMs`. On `onBlur` and submit, validation always runs immediately regardless.

### Server-side errors

Use `setError` to set server-side/custom errors as either a top-level `error` or a field error.

```ts
handler: async (values) => {
  const res = await api.signup(values);
  if (res.error === "username_taken") {
    setError("name", "That name is already in use");
    return;
  }
};
```

To set the top-level `error`, pass one argument: `setError('Something went wrong')`.

### Dirty and touched state

```tsx
const { isDirty, dirtyFields, touchedFields, reset } = useZuperForm({ ... })

<button type="button" onClick={() => reset()} disabled={!isDirty}>
  Reset
</button>
```

`isDirty` compares current values against the original `defaultValues`. `reset()` also accepts new values, `reset(newValues)`, for cases like loading a fresh record into the same form.

## Performance notes

zuperform uses controlled inputs. This keeps the API simple and means `watch`, `isDirty`, and `dirtyFields` all fall out of the same reactive state.

It also means that every `onChange` will trigger a re-render for the whole form and all its inputs. This is no problem for most forms, but for really large forms (50+ fields) it can cause performance issues.

## License

MIT
