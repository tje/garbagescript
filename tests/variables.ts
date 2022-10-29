import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { evaluate } from '../src'

test('Create a variable', () => {
  const res = evaluate(`let $one = 2`)
  assert.is(res, 2)
})

// test('Alternative assignment', () => {
//   const res = evaluate(`$one := 2`)
//   assert.is(res, 2)
// })

test('String variable', () => {
  const a = evaluate(`let $one = "Test"`)
  const b = evaluate(`let $one = ""`)
  const c = evaluate(`let $one = "10"`)
  assert.is(a, 'Test')
  assert.is(b, '')
  assert.is(c, '10')
})

test('Bool variable', () => {
  const a = evaluate(`let $one = true`)
  const b = evaluate(`let $one = false`)
  assert.is(a, true)
  assert.is(b, false)
})

test('Array variable', () => {
  const a = evaluate(`let $one = []`)
  const b = evaluate(`let $one = ["x"]`)
  const c = evaluate(`let $one = ["abc","def"]`)
  // const d = evaluate(`let $one = [,,"x"]`)
  assert.is(JSON.stringify(a), '[]')
  assert.is(JSON.stringify(b), '["x"]')
  assert.is(JSON.stringify(c), '["abc","def"]')
  // assert.is(d, undefined)
})

test('Increment number', () => {
  const res = evaluate(`let $one = 2\n$one += 1`)
  assert.is(res, 3)
})

test('Decrement number', () => {
  const res = evaluate(`let $one = 2\n$one -= 1`)
  assert.is(res, 1)
})

test('Replace variable', () => {
  const res = evaluate(`let $one = 2\n$one = 10`)
  assert.is(res, 10)
})

test('Multiple variables', () => {
  const res = evaluate(`let $one = 1\nlet $two = 2\n$one`)
  assert.is(res, 1)
})

test('Shadowed variables', () => {
  const res = evaluate(`let $one = 1\n{let $one = 2;}\n$one`)
  assert.is(res, 1)
})

test('Update variable in child block', () => {
  const res = evaluate(`let $one = 1\n{$one = 2;}\n$one`)
  assert.is(res, 2)
})

test('Assign variable from block tail', () => {
  const res = evaluate(`let $one = {let $two = 3\n$two += 1\n$two;}\n$one`)
  assert.is(res, 4)
})

test('Variable variables not allowed', () => {
  assert.throws(() => evaluate(`let $one = "x"\nlet $var = "one"\n$$var`))
})

test.run()
