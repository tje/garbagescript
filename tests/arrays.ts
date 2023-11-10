import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { evaluate } from '../src'

test('iterate simple', () => {
  assert.is(evaluate('let $sum = 0\neach $thing in $things {\n  $sum += $thing\n}\n$sum', { $things: [ 1, 2, 3 ] }), 6)
})

test('take single', () => {
  assert.is(
    evaluate(`
      let $total = 0
      each $items {
        take $cost
        $total += $cost
      }
      $total
    `, {
      $items: [
        { $cost: 1 },
        { $cost: 6 },
        { $cost: 3 },
      ],
    }),
    10
  )
})

test('take multi', () => {

  assert.is(
    evaluate(`
      let $total = 0
      each $items {
        take { $cost, $quantity }
        $total += $cost * $quantity
      }
      $total
    `, {
      $items: [
        { $cost: 1, $quantity: 1 },
        { $cost: 6, $quantity: 2 },
        { $cost: 3, $quantity: 1 },
      ],
    }),
    16
  )
})

test('includes multi', () => {
  const script = `$things includes "one" or $things includes "two"`
  assert.is(
    evaluate(script, {
      $things: [ 'one', 'two' ],
    }),
    true
  )
  assert.is(
    evaluate(script, { $things: [ 'two' ] }),
    true,
  )
  assert.is(
    evaluate(script, { $things: [ 'one' ] }),
    true,
  )
  assert.is(
    evaluate(script, { $things: [ 'none' ] }),
    false,
  )
  assert.is(
    evaluate(script, { $things: [ ] }),
    false,
  )
})

test('includes multi assign', () => {
  const script = `let $ok = $things includes "one" or $things includes "two"\n$ok`
  assert.is(
    evaluate(script, {
      $things: [ 'one', 'two' ],
    }),
    true
  )
  assert.is(
    evaluate(script, { $things: [ 'two' ] }),
    true,
  )
  assert.is(
    evaluate(script, { $things: [ 'one' ] }),
    true,
  )
  assert.is(
    evaluate(script, { $things: [ 'none' ] }),
    false,
  )
  assert.is(
    evaluate(script, { $things: [ ] }),
    false,
  )
})

test('in multi', () => {
  const script = `"one" in $things or "two" in $things`
  assert.is(
    evaluate(script, {
      $things: [ 'one', 'two' ],
    }),
    true
  )
  assert.is(
    evaluate(script, { $things: [ 'two' ] }),
    true,
  )
  assert.is(
    evaluate(script, { $things: [ 'one' ] }),
    true,
  )
  assert.is(
    evaluate(script, { $things: [ 'none' ] }),
    false,
  )
  assert.is(
    evaluate(script, { $things: [ ] }),
    false,
  )
})

test('in multi assign', () => {
  const script = `let $ok = "one" in $things or "two" in $things\n$ok`
  assert.is(
    evaluate(script, {
      $things: [ 'one', 'two' ],
    }),
    true
  )
  assert.is(
    evaluate(script, { $things: [ 'two' ] }),
    true,
  )
  assert.is(
    evaluate(script, { $things: [ 'one' ] }),
    true,
  )
  assert.is(
    evaluate(script, { $things: [ 'none' ] }),
    false,
  )
  assert.is(
    evaluate(script, { $things: [ ] }),
    false,
  )
})

test.skip('includes any', () => {
  const data = {
    $things: [ 'one', 'two', 'three' ],
  }
  assert.is(evaluate('$things includes any [ "four", "five" ]', data), false)
  assert.is(evaluate('$things includes any [ "one", "five" ]', data), true)
  assert.is(evaluate('$things includes any [ "one", "two" ]', data), true)
})

test.skip('any in', () => {
  const data = {
    $things: [ 'one', 'two', 'three' ],
  }
  assert.is(evaluate('any $things in [ "four", "five" ]', data), false)
  assert.is(evaluate('any $things in [ "one", "five" ]', data), true)
  assert.is(evaluate('any $things in [ "one", "two" ]', data), true)
})

test.skip('includes all', () => {
  const data = {
    $things: [ 'one', 'two', 'three' ],
  }
  assert.is(evaluate('$things includes all [ "four", "five" ]', data), false)
  assert.is(evaluate('$things includes all [ "one", "five" ]', data), false)
  assert.is(evaluate('$things includes all [ "one", "two" ]', data), true)
})

test.skip('all in', () => {
  const data = {
    $things: [ 'one', 'two', 'three' ],
  }
  assert.is(evaluate('all [ "four", "five" ] in $things', data), false)
  assert.is(evaluate('all [ "one", "five" ] in $things', data), false)
  assert.is(evaluate('all [ "one", "two" ] in $things', data), true)
})

test.skip('not includes', () => {
  const data = {
    $things: [ 'one', 'two', 'three' ],
  }
  assert.is(evaluate('$things not includes "one"', data), false)
  assert.is(evaluate('$things not includes "five"', data), true)
})

test.skip('not includes any', () => {
  const data = {
    $things: [ 'one', 'two', 'three' ],
  }
  assert.is(evaluate('$things not includes any [ "four", "five" ]', data), false)
  assert.is(evaluate('$things not includes any [ "one", "five" ]', data), true)
})

test('push', () => {
  assert.equal(evaluate('let $things = [ "a", "b" ]\n$things + "c"'), ['a', 'b', 'c'])
  assert.equal(evaluate('let $things = [ "a", "b" ]\n$things + "c"\n$things'), ['a', 'b'])
  assert.equal(evaluate('let $things = [ "a", "b" ]\n$things += "c"\n$things'), ['a', 'b', 'c'])
  assert.throws(() => evaluate('$things += "c"\n$things', { $things: ['a', 'b' ] }), 'immutable')
})
test('push multiple', () => {
  assert.equal(evaluate('let $things = [ "a", "b" ]\n$things + [ "c", "d" ]'), ['a', 'b', 'c', 'd'])
  assert.equal(evaluate('let $things = [ "a", "b" ]\n$things + [ "c", "d" ]\n$things'), ['a', 'b'])
  assert.equal(evaluate('let $things = [ "a", "b" ]\n$things += [ "c", "d" ]\n$things'), ['a', 'b', 'c', 'd'])
})

test('pull', () => {
  assert.equal(evaluate('let $things = [ "a", "b" ]\n$things - "b"'), ['a'])
  assert.equal(evaluate('let $things = [ "a", "b" ]\n$things - "b"\n$things'), ['a', 'b'])
  assert.equal(evaluate('let $things = [ "a", "b" ]\n$things -= "b"\n$things'), ['a'])
  assert.throws(() => evaluate('$things -= "b"\n$things', { $things: ['a', 'b'] }), 'immutable')
})
test('pull multiple', () => {
  assert.equal(evaluate('let $things = [ "a", "b", "c" ]\n$things - [ "b", "c" ]'), ['a'])
  assert.equal(evaluate('let $things = [ "a", "b", "c" ]\n$things - [ "b", "c" ]\n$things'), ['a', 'b', 'c'])
  assert.equal(evaluate('let $things = [ "a", "b", "c" ]\n$things -= [ "b", "c" ]\n$things'), ['a'])
})

test('no infinite loops', () => {
  assert.equal(evaluate('let $things = [ "a" ]\neach $things {\n$things += "b"\n}\n$things'), [ 'a', 'b' ])
})

test('index', () => {
  assert.equal(evaluate('let $things = [ 1, 1, 1 ]\nlet $n = []\neach $things {\n$n += index\n}\n$n'), [ 0, 1, 2 ])
})

test('index outside of array throws', () => {
  assert.throws(() => evaluate('index'), 'undefined')
})

test.run()
