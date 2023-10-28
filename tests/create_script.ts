import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { createScript } from '../src'

test('create script and run', () => {
  const gs = createScript('1 + 2')
  assert.is(gs.script, '1 + 2')
  assert.is(gs.evaluate(), 3)
})

test('create script and run many times', () => {
  const gs = createScript('$x * 10')
  assert.is(gs.script, '$x * 10')
  assert.is(gs.evaluate({ $x: 5 }), 50)
  assert.is(gs.evaluate({ $x: 2 }), 20)
  assert.is(gs.evaluate({ $x: 10 }), 100)
})

test('create and update script', () => {
  const gs = createScript('1 + 2')
  assert.is(gs.script, '1 + 2')
  assert.is(gs.evaluate(), 3)

  gs.script = '2 + 2'
  assert.is(gs.script, '2 + 2')
  assert.is(gs.evaluate(), 4)
})

test.run()
