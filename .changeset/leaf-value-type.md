---
"@zupertools/form-core": patch
---

Added a shared `LeafValue` type (`string | number | boolean | Date | null | undefined`) for primitive field values, and a `getLeafValue` helper that reads one out of a values object. `stringifyValue` now takes a `LeafValue` instead of an inline union, so the set of supported primitive types lives in one place.
