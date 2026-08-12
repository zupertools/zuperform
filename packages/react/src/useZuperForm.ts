import {
  HTMLInputTypeAttribute,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import z, { ZodObject } from 'zod'
import {
  createFormStore,
  getAsyncDeps,
  getAsyncFields,
  reverseMapDeps,
} from '@zupertools/form-core'
import type { Paths, PathValue } from '@zupertools/form-core'
import { flattenPaths, getIn, getLeafValue } from '@zupertools/form-core'
import { stringifyValue } from '@zupertools/form-core'
import type { ArrayStoreAccess } from '@zupertools/form-core'
type ValidationMode = 'onSubmit' | 'onChange' | 'onBlur'

interface UseZuperFormProps<T extends ZodObject> {
  schema: T
  defaultValues: z.input<T>
  handler: (values: z.output<T>) => Promise<void>
  mode?: ValidationMode
  reValidateMode?: ValidationMode
  asyncDebounceMs?: number
  deps?: Partial<Record<Paths<z.input<T>>, Paths<z.input<T>>[]>>
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
  deps,
}: UseZuperFormProps<T>) {
  type InputValues = z.input<T>
  const storeRef = useRef(createFormStore(schema, defaultValues))
  const store = storeRef.current
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [error, setTopLevelError] = useState<string | null>(null)

  const asyncFieldsRef = useRef<Set<string>>(
    getAsyncFields(schema, defaultValues),
  )

  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  )

  // Tracks raw string/boolean values
  // File inputs bypass this and writes directly to store values
  const rawValuesRef = useRef<Record<string, string | boolean>>({})

  const reversedDeps = useMemo(
    () => (deps ? reverseMapDeps(deps) : undefined),
    [deps],
  )

  const asyncDepsRef = useRef<Set<string>>(
    deps ? getAsyncDeps(schema, deps, defaultValues) : new Set<string>(),
  )

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

  function debouncedValidateField<P extends Paths<InputValues>>(name: P) {
    clearTimeout(debounceTimers.current[name])
    const isAsync =
      asyncFieldsRef.current.has(name) || asyncDepsRef.current.has(name)

    if (isAsync) {
      debounceTimers.current[name] = setTimeout(() => {
        store.validateField(name, deps?.[name])
      }, asyncDebounceMs)
    } else {
      store.validateField(name, deps?.[name])
    }
  }

  function bind<P extends Paths<InputValues>>(
    name: P,
    type: HTMLInputTypeAttribute,
  ) {
    const coercedValue = getLeafValue(values, name)
    const rawValue = rawValuesRef.current[name]

    function onChange(e: React.ChangeEvent<FormInputElement>) {
      if (type === 'file' && e.target instanceof HTMLInputElement) {
        const raw = e.target.multiple ? e.target.files : e.target.files?.[0]
        store.setValue(name, raw)
      } else if (type === 'checkbox' && e.target instanceof HTMLInputElement) {
        const raw = e.target.checked
        rawValuesRef.current[name] = raw
        store.setRawValue(name, raw)
      } else {
        const raw = e.target.value
        rawValuesRef.current[name] = raw
        store.setRawValue(name, raw)
      }

      const currentHasError = Boolean(store.getErrors()[name])
      if (
        (currentHasError && reValidateMode === 'onChange') ||
        (!currentHasError && mode === 'onChange')
      ) {
        debouncedValidateField(name)
        reversedDeps?.[name]?.forEach((dep) => {
          if (store.isTouched(dep) || store.getErrors()[dep])
            debouncedValidateField(dep)
        })
      }
    }

    function onBlur() {
      store.touch(name)
      const currentHasError = Boolean(store.getErrors()[name])
      if (
        (currentHasError && reValidateMode === 'onBlur') ||
        (!currentHasError && mode === 'onBlur')
      ) {
        debouncedValidateField(name)
        reversedDeps?.[name]?.forEach((dep) => {
          if (store.isTouched(dep) || store.getErrors()[dep])
            debouncedValidateField(dep)
        })
      }
    }

    if (type === 'checkbox') {
      return {
        name,
        type,
        onChange,
        onBlur,
        checked:
          typeof rawValue === 'boolean' ? rawValue : Boolean(coercedValue),
      }
    }

    if (type === 'file') {
      return {
        name,
        type,
        onChange,
        onBlur,
      }
    }

    if (type === 'radio') {
      return {
        name,
        type,
        onChange,
        onBlur,
      }
    }

    if (type === 'select') {
      return {
        name,
        onChange,
        onBlur,
        value:
          typeof rawValue === 'string'
            ? rawValue
            : stringifyValue(coercedValue, type),
      }
    }

    return {
      name,
      type,
      onChange,
      onBlur,
      value:
        typeof rawValue === 'string'
          ? rawValue
          : stringifyValue(coercedValue, type),
    }
  }

  function getFieldErrors<P extends Paths<InputValues>>(name: P) {
    return errors[name]
  }

  function watch(): InputValues
  function watch<P extends Paths<InputValues>>(
    name?: P,
  ): PathValue<InputValues, P>
  function watch<P extends Paths<InputValues>>(name?: P) {
    if (name === undefined) return values
    return getIn<PathValue<InputValues, P>>(values, name)
  }

  function reset(nextValues?: InputValues) {
    rawValuesRef.current = {}
    store.reset(nextValues)
  }

  function resetField<P extends Paths<InputValues>>(
    name: P,
    nextValue?: PathValue<InputValues, P>,
  ) {
    clearRawValue(name)
    store.resetField(name, nextValue)
  }

  function setValue<P extends Paths<InputValues>>(
    name: P,
    value: PathValue<InputValues, P>,
  ) {
    clearRawValue(name)
    store.setValue(name, value)
  }

  const dirtyFields = useMemo(
    () =>
      flattenPaths(values).reduce(
        (acc, path) => {
          if (store.isDirty(path)) acc[path] = true
          return acc
        },
        {} as Record<string, boolean>,
      ),
    [values, store],
  )
  const isDirty = Object.keys(dirtyFields).length > 0

  function setError(message: string | null): void
  function setError(path: Paths<InputValues>, messages: string[]): void
  function setError(
    pathOrMessage: Paths<InputValues> | (string | null),
    messages?: string[],
  ): void {
    if (messages === undefined) {
      setTopLevelError(pathOrMessage)
    } else {
      store.setFieldError(pathOrMessage as Paths<InputValues>, messages)
    }
  }

  function addFieldError(path: Paths<InputValues>, messages: string[]): void {
    store.setFieldError(path, messages, true)
  }

  function setIssues(issues: z.core.$ZodIssue[]): void {
    store.setIssues(issues)
  }

  function clearError(path?: Paths<InputValues>): void {
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

  const internalStore: ArrayStoreAccess<InputValues> = {
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
    setIssues,
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
