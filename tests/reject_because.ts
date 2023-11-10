import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { validate } from '../src'

test('simple subject', () => {
  const script = `
    validate {
      if $x != 2 {
        reject $x because "x should be 2"
      }
    }
  `
  const res = validate(script, { $x: 1 })
  assert.is(res.validationErrors[0].message, 'x should be 2')
  assert.is(res.validationErrors[0].subject?.unwrap(), 1)
})

test('subject path in arrays', () => {
  const script = `
    validate {
      each $item of $items {
        if $item != 2 {
          reject $item because "item should be 2"
        }
      }
    }
  `
  const res = validate(script, { $items: [ 1, 2, 3 ] })
  assert.is(res.validationErrors[0].message, 'item should be 2')
  assert.is(res.validationErrors[0].subject?.unwrap(), 1)
  assert.equal(res.validationErrors[0].subject?.path, [ '$items', 0 ])

  assert.is(res.validationErrors[1].message, 'item should be 2')
  assert.is(res.validationErrors[1].subject?.unwrap(), 3)
  assert.equal(res.validationErrors[1].subject?.path, [ '$items', 2 ])
})

test('subject path in complex collections', () => {
  const script = `
    validate {
      each $items {
        take $things
        each $things {
          take $value
          if $value != 2 {
            reject $value because "value should be 2"
            reject $things because "all things should be 2"
          }
        }
      }
    }
  `
  const res = validate(script, {
    $items: [
      {
        $things: [
          { $value: 1 },
          { $value: 2 },
        ],
      },
      {
        $things: [
          { $value: 2 },
          { $value: 2 },
        ],
      },
    ],
  })

  assert.is(res.validationErrors.length, 2)

  assert.is(res.validationErrors[0].message, 'value should be 2')
  assert.is(res.validationErrors[0].subject?.unwrap(), 1)
  assert.equal(res.validationErrors[0].subject?.path, [ '$items', 0, '$things', 0, '$value' ])

  assert.is(res.validationErrors[1].message, 'all things should be 2')
  assert.equal(res.validationErrors[1].subject?.unwrap(), [ { $value: 1 }, { $value: 2 } ])
  assert.equal(res.validationErrors[1].subject?.path, [ '$items', 0, '$things' ])
})

test.run()
