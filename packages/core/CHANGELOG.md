# @zupertools/form-core

## 0.3.1

### Patch Changes

- 4fa5bcd: Updated README's

## 0.3.0

### Minor Changes

- 113bde5: Support added for files and file lists
- 4daa6b9: clearFieldErrors() is remade into clearErrors() which now accepts a optional path parameter that when left empty clears all errors.

### Patch Changes

- 14f260e: Field dependencies added, which declares that one field's validation depends on another's value

## 0.2.1

### Patch Changes

- 1c078ea: Updated addFieldError() to replace snapshot object instead of mutating it to ensure the object reference changes.

## 0.2.0

### Minor Changes

- 8fc0bcd: Input values are now split into a raw store and a coerced store. The raw values is used as the input values, instead of coercing the raw value and only storing that. This opens up for more supported field values, and native support for dates are added.
