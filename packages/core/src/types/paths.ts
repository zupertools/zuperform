export type Paths<T> =
  T extends Array<infer U>
    ? `${number}` | `${number}.${Paths<U>}`
    : T extends object
      ? {
          [K in keyof T & string]: T[K] extends Array<infer U>
            ? K | `${K}.${number}` | `${K}.${number}.${Paths<U>}`
            : T[K] extends object
              ? K | `${K}.${Paths<T[K]>}`
              : K
        }[keyof T & string]
      : never

export type PathValue<
  T,
  P extends string,
> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? PathValue<T[K], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never
