import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { evaluate } from '../src/index.js'

test('concat', () => {
  assert.is(evaluate('"a" + "b"'), 'ab')
})

test('escape quotes', () => {
  assert.is(evaluate('"\\"a\\""'), '"a"')
})

test.run()
