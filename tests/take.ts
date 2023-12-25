import { suite } from 'uvu'
import * as assert from 'uvu/assert'
import { evaluate } from '../src'

const test = suite(undefined, (() => {
  const subjectData = {
    $items: [
      { $amount: 20, $quantity: 1 },
      { $amount: 5, $quantity: 2 },
      { $amount: 7, $quantity: 1 },
      { $amount: 2, $quantity: 5 },
    ],
    $special: {
      $discount: 5,
    },
  }
  const expectedCount = subjectData.$items
    .reduce((t, item) => t + item.$quantity, 0)
  const expectedSubTotal = subjectData.$items
    .reduce((t, item) => t + (item.$quantity * item.$amount), 0)
  const expectedTotal = expectedSubTotal - subjectData.$special.$discount
  const expectedDiscount = subjectData.$special.$discount
  return {
    subjectData,
    expectedCount,
    expectedSubTotal,
    expectedTotal,
    expectedDiscount,
  }
})())
test('take $prop', (ctx) => {
  const script = `
    let $t = 0
    each $items {
      take $quantity
      $t += $quantity
    }
    $t
  `
  assert.equal(evaluate(script, ctx.subjectData), ctx.expectedCount)
})
test('take { $prop, $prop }', (ctx) => {
  const script = `
    let $t = 0
    each $items {
      take { $quantity, $amount }
      $t += $quantity * $amount
    }
    $t
  `
  assert.equal(evaluate(script, ctx.subjectData), ctx.expectedSubTotal)
})
test('take $prop from $prop', (ctx) => {
  const script = `
    take $discount from $special
    $discount
  `
  assert.equal(evaluate(script, ctx.subjectData), ctx.expectedDiscount)
})
test('take { $prop } from $prop', (ctx) => {
  const script = `
    take { $discount } from $special
    $discount
  `
  assert.equal(evaluate(script, ctx.subjectData), ctx.expectedDiscount)
})
test('take $prop as $local', (ctx) => {
  const script = `
    let $t = 0
    each $items {
      take $quantity as $q
      $t += $q
    }
    $t
  `
  assert.equal(evaluate(script, ctx.subjectData), ctx.expectedCount)
})
test('take { $prop as $local, $prop }', (ctx) => {
  const script = `
    let $t = 0
    each $items {
      take { $quantity as $q, $amount }
      $t += $q * $amount
    }
    $t
  `
  assert.equal(evaluate(script, ctx.subjectData), ctx.expectedSubTotal)
})
test('take $prop as $local from $prop', (ctx) => {
  const script = `
    take $discount as $d from $special
    $d
  `
  assert.equal(evaluate(script, ctx.subjectData), ctx.expectedDiscount)
})
test('take { $prop as $local } from $prop', (ctx) => {
  const script = `
    take { $discount as $d } from $special
    $d
  `
  assert.equal(evaluate(script, ctx.subjectData), ctx.expectedDiscount)
})

test.run()
