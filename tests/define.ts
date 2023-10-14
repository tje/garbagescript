import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { evaluate } from '../src'

test('define ornament', () => {
  assert.is(evaluate('define :hello "hello"\n"":hello'), 'hello')
})

test('transform input', () => {
  assert.is(evaluate('define :double {\ntake $input\n$input * 2\n}\n5:double'), 10)
})

test('undefined ornament', () => {
  assert.throws(() => evaluate('"hi":nothing'))
})

test('can\'t overwrite custom definitions', () => {
  assert.throws(() => evaluate('define :test {}\ndefine :test "x"'))
})

test.skip('can overwrite predefined definitions', () => {
  assert.is(evaluate('define :length 0\n"hello":length'), 0)
})

test('money', () => {
  const pre = 'define :money {\ntake $input\n"$" + (($input * 100):round / 100)\n}'
  assert.is(evaluate(`${pre}\n123.000001:money`), '$123')
})

test.run()
