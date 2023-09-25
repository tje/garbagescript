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

test('remainder', () => {
  assert.is(evaluate('5 % 2'), 1)
  assert.is(evaluate('6 % 2'), 0)
  assert.is(evaluate('0 % 2'), 0)
  assert.is(evaluate('5 mod 2'), 1)
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

test('luhn', () => {
  const script = `
  let $digits = $sequence:characters:reverse
  let $sum = 0
  let $i = 0
  each $digit of $digits {
    let $n = $digit * 1
    if $i % 2 == 1 {
      $n *= 2
    }
    if $n > 9 {
      $n -= 9
    }
    $sum += $n
    $i += 1
  }
  $sum > 0 and $sum % 10 == 0
  `
  const samples = [
    [ '378282246310005',  true ],
    [ '371449635398431',  true ],
    [ '378734493671000',  true ],
    [ '5610591081018250', true ],
    [ '30569309025904',   true ],
    [ '38520000023237',   true ],
    [ '6011111111111117', true ],
    [ '6011000990139424', true ],
    [ '3530111333300000', true ],
    [ '3566002020360505', true ],
    [ '5555555555554444', true ],
    [ '5105105105105100', true ],
    [ '4111111111111111', true ],
    [ '4012888888881881', true ],
    [ '4222222222222',    true ],
    [ 'asdf', false ],
    [ '000', false ],
    [ '', false ],
  ]
  for (const sample of samples) {
    assert.is(evaluate(script, { $sequence: sample[0] }), sample[1])
  }
})

// @todo
// test('frac', () => {
//   assert.is(evaluate('0.5 + 0.5'), 1)
// })

test.run()
