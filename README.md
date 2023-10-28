This is an experimental scripting language designed specifically for data validation. It is intended to be easy to understand and adopt quickly.

## Usage

Basic evaluation usage:

```js
import { createScript } from 'garbagescript'

// Create a simple multiplication script
const gs = createScript(`$input * 10`)

// Evaluate the script, providing the predetermined `$input` variable
const result = gs.evaluate({ $input: 5 }) // 50
```

As a validation utility:

```ts
import { createScript } from 'garbagescript'

const { validate } = createScript(`
validate {
  if $display_name == "" {
    reject "Display name is required"
  }

  if $password:length < 8 {
    reject "Password must be at least 8 characters long"
  }

  if $birth_date > today - 18 years {
    reject "You must be 18 years or older"
  }
}
`)

const result = validate({
  $display_name: 'Example',
  $password: 'secret',
  $birth_date: new Date(1980, 3, 15),
})

const errors = result.validationErrors
if (errors.length > 0) {
  // Do something with the errors, in this case there is
  // only one regarding the password:
  for (const error of errors) {
    // "Password must be at least 8 characters long"
    console.log(error.message)
  }
}
```
