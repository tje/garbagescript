import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { evaluate } from '../src'

test('add', () => {
  assert.is(evaluate('1 + 1'), 2)
  assert.is(evaluate('1 + 2'), 3)
  assert.is(evaluate('1 + -1'), 0)
})

test('subtract', () => {
  assert.is(evaluate('1 - 1'), 0)
  assert.is(evaluate('1 - 2'), -1)
})

test('divide', () => {
  assert.is(evaluate('1 / 2'), 0.5)
  assert.is(evaluate('10 / 10'), 1)
})

test('multiply', () => {
  assert.is(evaluate('2 * 2'), 4)
  assert.is(evaluate('5 * 10'), 50)
  assert.is(evaluate('1 * -2'), -2)
})

test('greater/less than', () => {
  assert.is(evaluate('2 > 1'), true)
  assert.is(evaluate('2 > 2'), false)
  assert.is(evaluate('2 > 3'), false)
  assert.is(evaluate('2 > -3'), true)
  assert.is(evaluate('2 >= 2'), true)
  assert.is(evaluate('2 < 1'), false)
  assert.is(evaluate('2 < 3'), true)
  assert.is(evaluate('2 <= 2'), true)
})
test('equality', () => {
  assert.is(evaluate('2 == 2'), true)
  assert.is(evaluate('2 == 3'), false)
  assert.is(evaluate('2 == -2'), false)
  assert.is(evaluate('-2 == -2'), true)
  assert.is(evaluate('2 != 2'), false)
  assert.is(evaluate('2 != 3'), true)
  assert.is(evaluate('-2 != 2'), true)
  assert.is(evaluate('-2 != -2'), false)
})

test('operator precedence', () => {
  assert.is(evaluate('1 + 2 * 10'), 21)
  assert.is(evaluate('2 * 10 + 1'), 21)
  assert.is(evaluate('5 < 4 + 2'), true)
  assert.is(evaluate('1 + 2 * 3 + 4 > 0'), true)
})

// @todo
// test('frac', () => {
//   assert.is(evaluate('0.5 + 0.5'), 1)
// })

test.run()
