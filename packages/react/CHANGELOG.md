# @zupertools/form-react

## 0.3.0

### Minor Changes

- 14f260e: New feature: Field dependencies let you declare that one field's validation depends on another's value
- 113bde5: Updated bind() to take the input type as a parameter, which allowed for support for all standard inputs including file uploads

### Patch Changes

- 4daa6b9: New clearErrors() function in hook for clearing all errors or, when path passed, a field's errors.
- 82f9c19: Debounce timers are now cleaned up on unmount to prevent performace issues.
- 295a074: Dirty fields are now memoized to prevent unnecessary re-computation
- 7bba1d6: When setting a top-level error with setError(message), it now accepts a null value for clearing the error.
- Updated dependencies [113bde5]
- Updated dependencies [4daa6b9]
- Updated dependencies [14f260e]
  - @zupertools/form-core@0.3.0

## 0.2.2

### Patch Changes

- 833591f: Fixed the message parameter of setError() when setting top-level errors to accept a string instead of an array of strings.

## 0.2.1

### Patch Changes

- 1c078ea: Split setError() to setError() and addFieldError() and updated parameters to use arrays instead of strings in line with the core.
- Updated dependencies [1c078ea]
  - @zupertools/form-core@0.2.1

## 0.2.0

### Minor Changes

- 8fc0bcd: Input values are now split into a raw store and a coerced store. The raw values is used as the input values, instead of coercing the raw value and only storing that. This opens up for more supported field values, and native support for dates are added.

### Patch Changes

- a01069b: Fixed bug where arrays would not work with useFieldArray()
- c69501b: Fixed isSubmitting state so it includes schema validation and it not delayed byt it
- Updated dependencies [8fc0bcd]
  - @zupertools/form-core@0.2.0

## 0.1.1

### Patch Changes

- 47d3df8: Fix recurring typo in the docs in README
