# @zupertools/form-react

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
