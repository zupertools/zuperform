import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import z, { ZodBoolean, ZodObject } from 'zod'
import { createFormStore, getAsyncFields } from '@zupertools/form-core'
import type { Paths, PathValue } from '@zupertools/form-core'
import { flattenPaths, getIn, getLeafValue } from '@zupertools/form-core'
import { getSchemaAtPath, stringifyValue } from '@zupertools/form-core'
import type { ArrayStoreAccess } from '@zupertools/form-core'

type ValidationMode = 'onSubmit' | 'onChange' | 'onBlur'

interface UseZuperFormProps<T extends ZodObject> {
  schema: T
  defaultValues: z.infer<T>
  handler: (values: z.infer<T>) => Promise<void>
  mode?: ValidationMode
  reValidateMode?: ValidationMode
  asyncDebounceMs?: number
}

type FormInputElement =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement

export function useZuperForm<T extends ZodObject>({
  schema,
  defaultValues,
  handler,
  mode = 'onSubmit',
  reValidateMode = 'onChange',
  asyncDebounceMs = 300,
}: UseZuperFormProps<T>) {
  type Values = z.infer<T>
  const storeRef = useRef(createFormStore(schema, defaultValues))
  const store = storeRef.current
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [error, setTopLevelError] = useState<string | null>(null)

  const asyncFieldsRef = useRef<Set<string>>(getAsyncFields(schema))

  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  )

  const rawValuesRef = useRef<Record<string, string | boolean>>({})

  const { values, errors, touched } = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
  )

  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout)
    }
  }, [])

  function clearRawValue(path: string) {
    const prefix = `${path}.`
    for (const key of Object.keys(rawValuesRef.current)) {
      if (key === path || key.startsWith(prefix)) {
        delete rawValuesRef.current[key]
      }
    }
  }

  function debouncedValidateField(name: string) {
    clearTimeout(debounceTimers.current[name])
    if (asyncFieldsRef.current.has(name)) {
      debounceTimers.current[name] = setTimeout(() => {
        store.validateField(name)
      }, asyncDebounceMs)
    } else {
      store.validateField(name)
    }
  }

  function bind<P extends Paths<Values>>(name: P) {
    const fieldSchema = getSchemaAtPath(schema, name)
    const coercedValue = getLeafValue(values, name)
    const rawValue = rawValuesRef.current[name]
    const isCheckbox = fieldSchema instanceof ZodBoolean

    function onChange(e: React.ChangeEvent<FormInputElement>) {
      const raw =
        e.target instanceof HTMLInputElement && e.target.type === 'checkbox'
          ? e.target.checked
          : e.target.value
      rawValuesRef.current[name] = raw
      store.setRawValue(name, raw)

      const currentHasError = Boolean(store.getErrors()[name])
      if (currentHasError && reValidateMode === 'onChange') {
        debouncedValidateField(name)
      } else if (!currentHasError && mode === 'onChange') {
        debouncedValidateField(name)
      }
    }

    function onBlur() {
      store.touch(name)
      const currentHasError = Boolean(store.getErrors()[name])
      if (currentHasError && reValidateMode === 'onBlur') {
        store.validateField(name)
      } else if (!currentHasError && mode === 'onBlur') {
        store.validateField(name)
      }
    }

    const props = {
      name,
      ...(isCheckbox
        ? {
            checked:
              typeof rawValue === 'boolean' ? rawValue : Boolean(coercedValue),
          }
        : {
            value:
              typeof rawValue === 'string'
                ? rawValue
                : stringifyValue(coercedValue),
          }),
      onChange,
      onBlur,
    }

    return props
  }

  function getFieldErrors<P extends Paths<Values>>(name: P) {
    return errors[name]
  }

  function watch(): Values
  function watch<P extends Paths<Values>>(name?: P): PathValue<Values, P>
  function watch<P extends Paths<Values>>(name?: P) {
    if (name === undefined) return values
    return getIn<PathValue<Values, P>>(values, name)
  }

  function reset(nextValues?: Values) {
    rawValuesRef.current = {}
    store.reset(nextValues)
  }

  function resetField<P extends Paths<Values>>(
    name: P,
    nextValue?: PathValue<Values, P>,
  ) {
    clearRawValue(name)
    store.resetField(name, nextValue)
  }

  function setValue<P extends Paths<Values>>(
    name: P,
    value: PathValue<Values, P>,
  ) {
    clearRawValue(name)
    store.setValue(name, value)
  }

  const dirtyFields = flattenPaths(values).reduce(
    (acc, path) => {
      if (store.isDirty(path)) acc[path] = true
      return acc
    },
    {} as Record<string, boolean>,
  )
  const isDirty = Object.keys(dirtyFields).length > 0

  function setError(message: string | null): void
  function setError(path: Paths<Values>, messages: string[]): void
  function setError(
    pathOrMessage: Paths<Values> | (string | null),
    messages?: string[],
  ): void {
    if (messages === undefined) {
      setTopLevelError(pathOrMessage)
    } else {
      store.setFieldError(pathOrMessage as Paths<Values>, messages)
    }
  }

  function addFieldError(path: Paths<Values>, messages: string[]): void {
    store.setFieldError(path, messages, true)
  }

  function clearError(path?: Paths<Values>): void {
    store.clearErrors(path)
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)

    const result = await store.validate()
    if (!result.success) {
      setIsSubmitting(false)
      return
    }

    setTopLevelError(null)
    try {
      await handler(result.data)
    } catch (err) {
      setTopLevelError(
        err instanceof Error ? err.message : 'Something went wrong',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const internalStore: ArrayStoreAccess<Values> = {
    subscribe: store.subscribe,
    getSnapshot: store.getSnapshot,
    setValue: (path, value) => {
      clearRawValue(path)
      store.setValue(path, value)
    },
  }

  return {
    bind,
    getFieldErrors,
    handleSubmit,
    isSubmitting,
    error,
    setError,
    addFieldError,
    clearError,
    watch,
    reset,
    resetField,
    setValue,
    touchedFields: touched,
    dirtyFields,
    isDirty,
    _internal: internalStore,
  }
}
