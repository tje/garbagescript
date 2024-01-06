import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { evaluate } from '../src'

test('match', () => {
  assert.is(evaluate('"hello" matches /hello/'), true)
  assert.is(evaluate('"hello" matches /h.llo/'), true)
  assert.is(evaluate('"hello" matches /[a-z]+/'), true)
  assert.is(evaluate('"hello" matches /^h/'), true)
  assert.is(evaluate('"hello" matches /o$/'), true)
  assert.is(evaluate('"hello" matches /^hello$/'), true)

  assert.is(evaluate('"hello" matches /^x/'), false)
  assert.is(evaluate('"hello" matches /x$/'), false)
  assert.is(evaluate('"hello" matches /^.$/'), false)
  assert.is(evaluate('"hello" matches /\\d/'), false)
})

test('match flags', () => {
  assert.is(evaluate('"HELLO" matches /^hello$/i'), true)
  assert.is(evaluate('"hello\nworld" matches /^world$/'), false)
  assert.is(evaluate('"hello\nworld" matches /^world$/m'), true)
})

test.run()
