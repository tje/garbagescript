import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { evaluate } from '../src'

test('string length', () => {
  const a = evaluate(`"x":length`)
  const b = evaluate(`"xx":length`)
  const c = evaluate(`"":length`)
  assert.is(a, 1)
  assert.is(b, 2)
  assert.is(c, 0)
})

test('array length', () => {
  const a = evaluate(`["a"]:length`)
  const b = evaluate(`["a", "b"]:length`)
  const c = evaluate(`[]:length`)
  const d = evaluate(`[""]:length`)
  assert.is(a, 1)
  assert.is(b, 2)
  assert.is(c, 0)
  assert.is(d, 1)
  assert.throws(() => evaluate(':length'))
})

test('array mutation side effects', () => {
  assert.throws(() => evaluate('let $a = []\n$a:length = 2\n$a:length'))
})

test('number min', () => {
  const a = evaluate(`[1,2,3]:min`)
  const b = evaluate(`[3,2,1]:min`)
  const c = evaluate(`[-5,3,0]:min`)
  const d = evaluate(`[[0,5,10]:min, [-5,99]:min]:min`)
  assert.is(a, 1)
  assert.is(b, 1)
  assert.is(c, -5)
  assert.is(d, -5)
  assert.throws(() => evaluate('4:min'))
  assert.throws(() => evaluate('[1,2,"3"]:min'))
  assert.throws(() => evaluate('"4":min'))
  assert.throws(() => evaluate('[]:min'))
})

test('number max', () => {
  const a = evaluate(`[1,2,3]:max`)
  const b = evaluate(`[3,2,1]:max`)
  const c = evaluate(`[-5,3,0]:max`)
  const d = evaluate(`[[5,-5]:max, [0,10]:max]:max`)
  assert.is(a, 3)
  assert.is(b, 3)
  assert.is(c, 3)
  assert.is(d, 10)
  assert.throws(() => evaluate('4:max'))
  assert.throws(() => evaluate('[1,2,"3"]:max'))
  assert.throws(() => evaluate('"4":max'))
  assert.throws(() => evaluate('[]:max'))
})

test('number sum', () => {
  const a = evaluate(`[1,2,3]:sum`)
  const b = evaluate(`[3,2,1]:sum`)
  const c = evaluate(`[-5,3,0]:sum`)
  const d = evaluate(`[[1,2,2]:sum,[5,0]:sum]:sum`)
  assert.is(a, 6)
  assert.is(b, 6)
  assert.is(c, -2)
  assert.is(d, 10)
  assert.throws(() => evaluate('4:sum'))
  assert.throws(() => evaluate('[1,2,"3"]:sum'))
  assert.throws(() => evaluate('"4":sum'))
  assert.throws(() => evaluate('[]:sum'))
})

test('unrecognized ornaments', () => {
  assert.throws(() => evaluate('"asdf":nothing'))
  assert.throws(() => evaluate(':nothing'))
})

test('string words', () => {
  assert.equal(evaluate('"hello internet":words'), ['hello', 'internet'])
  assert.equal(evaluate('"hello internet\ngood times":words'), ['hello', 'internet', 'good', 'times'])
  assert.equal(evaluate('"\n\n\nhello internet\n\ngood times":words'), ['hello', 'internet', 'good', 'times'])
})
test('string lines', () => {
  assert.equal(evaluate('"hello internet":lines'), ['hello internet'])
  assert.equal(evaluate('"hello internet\ngood times":lines'), ['hello internet', 'good times'])
  assert.equal(evaluate('"hello internet\n\ngood times":lines'), ['hello internet', '', 'good times'])
  assert.equal(evaluate('"\nhello internet\ngood times\n\n":lines'), ['', 'hello internet', 'good times', '', ''])
})
test('string trim', () => {
  assert.is(evaluate('" hello internet ":trim'), 'hello internet')
  assert.is(evaluate('"     hello internet    ":trim'), 'hello internet')
  assert.is(evaluate('"\nhello internet\n\n":trim'), 'hello internet')
})

test('array unique', () => {
  assert.equal(evaluate('["a", "a", "b", "a", "c"]:unique'), ['a', 'b', 'c'])
  assert.equal(evaluate('["a", "a", "a", "a"]:unique'), ['a'])
  assert.equal(evaluate('[1, 2, 3, 1]:unique'), [1, 2, 3])
  assert.equal(evaluate('let $x = "a"\n[$x, $x, "b", $x]:unique'), ['a', 'b'])
})

test.run()
