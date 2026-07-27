import z, { ZodObject } from 'zod'
import { getIn, setIn } from './pathUtils'
import { FormStore } from './types/store'
import { validateAll, validateField as validateFieldAt } from './validate'
import { deepEqual } from './deepEqual'

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
      snapshot = {
        ...snapshot,
        values: setIn(snapshot.values, path, value),
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
      snapshot = {
        values: nextValues ? { ...nextValues } : { ...initialValues },
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
      snapshot = {
        values: setIn(
          snapshot.values,
          path,
          nextValue ?? getIn(initialValues, path),
        ),
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
    validateField: async (path: string) => {
      const messages = await validateFieldAt(schema, snapshot.values, path)
      const nextErrors = { ...snapshot.errors }
      if (messages) {
        nextErrors[path] = messages
      } else {
        delete nextErrors[path]
      }
      snapshot = { ...snapshot, errors: nextErrors }
      notify()
      return messages
    },
    addFieldError: (path: string, message: string) => {
      ;(snapshot.errors[path] ??= []).push(message)
      notify()
    },
    clearFieldErrors: (path: string) => {
      if (!(path in snapshot.errors)) return
      const nextErrors = { ...snapshot.errors }
      delete nextErrors[path]
      snapshot = { ...snapshot, errors: nextErrors }
      notify()
    },
    subscribe: (cb: () => void) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
  }
}
