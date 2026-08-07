import z, { ZodObject } from 'zod'
import { getIn, setIn } from './pathUtils'
import { FormStore } from './types/store'
import {
  mapIssuesToErrors,
  validateAll,
  validateField as validateFieldAt,
  validateFieldWithDeps as validateFieldWithDepsAt,
} from './validate'
import { deepEqual } from './deepEqual'
import { coerceToSchema, getSchemaAtPath } from './schemaIntrospection'

export function createFormStore<T extends ZodObject>(
  schema: T,
  defaultValues: z.infer<T>,
): FormStore<z.infer<T>> {
  const initialValues = { ...defaultValues } as z.infer<T>

  let snapshot = {
    values: initialValues,
    errors: {} as Record<string, string[]>,
    touched: {} as Record<string, boolean>,
  }
  const listeners = new Set<() => void>()

  function notify() {
    listeners.forEach((l) => l())
  }

  return {
    getSnapshot: () => snapshot,
    getErrors: () => snapshot.errors,
    getValues: () => snapshot.values,
    getValue: (path: string) => getIn(snapshot.values, path),
    isTouched: (path: string) => snapshot.touched[path],
    isDirty: (path: string) => {
      const current = getIn(snapshot.values, path)
      const original = getIn(initialValues, path)
      return !deepEqual(current, original)
    },
    setValue: (path: string, value: unknown) => {
      const values = setIn(snapshot.values, path, value)
      snapshot = {
        ...snapshot,
        values: values,
      }
      notify()
    },
    setRawValue: (path: string, raw: string | boolean) => {
      const fieldSchema = getSchemaAtPath(schema, path)
      const value = coerceToSchema(fieldSchema, raw)
      const values = setIn(snapshot.values, path, value)
      snapshot = {
        ...snapshot,
        values: values,
      }
      notify()
    },
    touch: (path: string) => {
      if (snapshot.touched[path]) return
      snapshot = {
        ...snapshot,
        touched: { ...snapshot.touched, [path]: true },
      }
      notify()
    },
    reset: (nextValues?: z.infer<T>) => {
      const values = nextValues ? { ...nextValues } : { ...initialValues }
      snapshot = {
        values: values,
        errors: {} as Record<string, string[]>,
        touched: {} as Record<string, boolean>,
      }
      notify()
    },
    resetField: (path: string, nextValue?: unknown) => {
      const nextErrors = { ...snapshot.errors }
      const nextTouched = { ...snapshot.touched }
      delete nextErrors[path]
      delete nextTouched[path]

      const values = setIn(
        snapshot.values,
        path,
        nextValue ?? getIn(initialValues, path),
      )

      snapshot = {
        values: values,
        errors: nextErrors,
        touched: nextTouched,
      }
      notify()
    },
    validate: async () => {
      const { result, errors } = await validateAll(schema, snapshot.values)
      snapshot = { ...snapshot, errors }
      notify()
      return result
    },
    validateField: async (path: string, deps?: string[]) => {
      if (deps?.length) {
        const errorsByPath = await validateFieldWithDepsAt(
          schema,
          snapshot.values,
          path,
          deps,
        )
        const nextErrors = { ...snapshot.errors }
        for (const [p, messages] of Object.entries(errorsByPath)) {
          if (messages) nextErrors[p] = messages
          else delete nextErrors[p]
        }
        snapshot = { ...snapshot, errors: nextErrors }
        notify()
        return errorsByPath[path]
      }

      const messages = await validateFieldAt(schema, snapshot.values, path)
      const nextErrors = { ...snapshot.errors }
      if (messages) nextErrors[path] = messages
      else delete nextErrors[path]
      snapshot = { ...snapshot, errors: nextErrors }
      notify()
      return messages
    },
    setFieldError: (
      path: string,
      messages: string[],
      append: boolean = false,
    ) => {
      const nextErrors = { ...snapshot.errors }
      nextErrors[path] = append
        ? [...(nextErrors[path] ?? []), ...messages]
        : messages
      snapshot = { ...snapshot, errors: nextErrors }
      notify()
    },
    setIssues: (issues: z.core.$ZodIssue[], merge: boolean = false) => {
      const mappedIssues = mapIssuesToErrors(issues)
      snapshot = {
        ...snapshot,
        errors: merge ? { ...snapshot.errors, ...mappedIssues } : mappedIssues,
      }
      notify()
    },
    clearErrors: (path?: string) => {
      if (!path) {
        snapshot = { ...snapshot, errors: {} }
        notify()
      } else {
        if (!(path in snapshot.errors)) return
        const nextErrors = { ...snapshot.errors }
        delete nextErrors[path]
        snapshot = { ...snapshot, errors: nextErrors }
        notify()
      }
    },
    subscribe: (cb: () => void) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
  }
}
