import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { evaluate } from '../src'

test('can not overwrite global', () => {
  assert.throws(() => evaluate('let $one = 2', { $one: 1 }), /variable already exists/)
})

test('validate { ... } scope', () => {
  assert.throws(() => evaluate('validate {\nlet $one = 2\n}\n$one'), /Undefined variable: \$one/)
  assert.throws(() => evaluate('validate {\nlet $two = $one\n}\n$two', { $one: 1 }), /Undefined variable: \$two/)
})

test('if { ... } scope', () => {
  assert.throws(() => evaluate('if true {\nlet $x = 1\n}\n$x'), /Undefined variable: \$x/)
})

test('each { ... } scope', () => {
  assert.throws(() => evaluate('each $item of $items {\nlet $x = $item\n}\n$x', { $items: [ 'a' ] }), /Undefined variable: \$x/)
  assert.throws(() => evaluate('each $item of $items {\nlet $x = $item\n}\n$item', { $items: [ 'a' ] }), /Undefined variable: \$item/)
})

test('inline { ... } scope', () => {
  const script = `
    let $x = {
      let $y = 10
      $y * 2
    }
  `
  assert.equal(evaluate(script + '$x'), 20)
  assert.throws(() => evaluate(script + '$y'), /Undefined variable: \$y/)
})

test.run()
