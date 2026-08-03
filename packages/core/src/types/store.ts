import { ZodSafeParseResult } from 'zod'

export interface FormStore<T> {
  getSnapshot: () => {
    values: T
    errors: Record<string, string[]>
    touched: Record<string, boolean>
  }
  getValues: () => T
  getErrors: () => Record<string, string[]>
  getValue: (path: string) => unknown
  isTouched: (path: string) => boolean
  isDirty: (path: string) => boolean
  setValue: (path: string, value: unknown) => void
  setRawValue: (path: string, raw: string | boolean) => void
  touch: (path: string) => void
  reset: (nextValues?: T) => void
  resetField: (path: string, nextValue?: unknown) => void
  validate: () => Promise<ZodSafeParseResult<T>>
  validateField: (path: string) => Promise<string[] | undefined>
  addFieldError: (path: string, message: string) => void
  clearFieldErrors: (path: string) => void
  subscribe: (cb: () => void) => () => void
}

export interface ArrayStoreAccess<T = Record<string, unknown>> {
  subscribe: FormStore<T>['subscribe']
  getSnapshot: FormStore<T>['getSnapshot']
  setValue: FormStore<T>['setValue']
}
