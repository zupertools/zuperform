# @zupertools/form-core

## 0.2.0

### Minor Changes

- 8fc0bcd: Input values are now split into a raw store and a coerced store. The raw values is used as the input values, instead of coercing the raw value and only storing that. This opens up for more supported field values, and native support for dates are added.
