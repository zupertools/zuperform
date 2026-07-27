![zuperform](https://raw.githubusercontent.com/zupertools/zuperform/main/assets/banner.png)

# zuperform

A form library built around Zod schemas. You describe your data shape once, and zuperform handles binding, validation, error state, dirty/touched tracking, and submission - all typed end-to-end from your schema.

- Schema-driven: form state, validation, and types all derive from your Zod schema
- Full TypeScript inference on field paths throughout the API
- Sync and async validation with no extra config
- Nested objects and dynamic arrays
- Dirty/touched tracking, server-side error integration, and automatic input coercion

## Example with the React adapter

```tsx
const schema = z.object({
  name: z.string().min(2, 'Name is too short'),
  email: z.email('Invalid email'),
})

function SignupForm() {
  const { bind, getFieldError, handleSubmit, isLoading, error } = useZuperForm({
    schema,
    defaultValues: { name: '', email: '' },
    handler: async (values) => {
      await api.signup(values)
    },
  })

  return (
    <form onSubmit={handleSubmit}>
      <input {...bind('name')} />
      <span>{getFieldError('name')}</span>

      <input {...bind('email')} />
      <span>{getFieldError('email')}</span>

      <button type="submit" disabled={isLoading}>
        Submit
      </button>
      {error && <span>{error}</span>}
    </form>
  )
}
```

## Packages

| Package                                      | Description              |
| -------------------------------------------- | ------------------------ |
| [`@zupertools/form-react`](./packages/react) | React adapter.           |
| [`@zupertools/form-core`](./packages/core)   | Framework-agnostic core. |

## Development

This is a pnpm monorepo. To set up locally:

```bash
pnpm install
pnpm run build
pnpm run test
```

Each package in `packages/` can also be built and tested individually:

```bash
cd packages/core
pnpm run build
pnpm run test
```

## License

MIT
