import z, { ZodSafeParseResult } from 'zod'

export interface FormStore<TInput, TOutput = TInput> {
  getSnapshot: () => {
    values: TInput
    errors: Record<string, string[]>
    touched: Record<string, boolean>
  }
  getValues: () => TInput
  getErrors: () => Record<string, string[]>
  getValue: (path: string) => unknown
  isTouched: (path: string) => boolean
  isDirty: (path: string) => boolean
  setValue: (path: string, value: unknown) => void
  setRawValue: (path: string, raw: string | boolean) => void
  touch: (path: string) => void
  reset: (nextValues?: TInput) => void
  resetField: (path: string, nextValue?: unknown) => void
  validate: () => Promise<ZodSafeParseResult<TOutput>>
  validateField: (
    path: string,
    deps?: string[],
  ) => Promise<string[] | undefined>
  setFieldError: (path: string, messages: string[], append?: boolean) => void
  setIssues: (issues: z.core.$ZodIssue[], merge?: boolean) => void
  clearErrors: (path?: string) => void
  subscribe: (cb: () => void) => () => void
}

export interface ArrayStoreAccess<T = Record<string, unknown>> {
  subscribe: FormStore<T>['subscribe']
  getSnapshot: FormStore<T>['getSnapshot']
  setValue: FormStore<T>['setValue']
}
