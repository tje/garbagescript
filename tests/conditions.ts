import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { evaluate } from '../src'

test('If then', () => {
  const a = evaluate(`if true {"x"}`)
  const b = evaluate(`if false {"x"}`)
  assert.is(a, 'x')
  assert.is(b, undefined)
})

test('Conditional logic', () => {
  const a = evaluate(`let $one = 1\nif true {\n$one+= 1\n}\n$one`)
  const b = evaluate(`let $one = 1\nif false {\n$one+= 1\n}\n$one`)
  assert.is(a, 2)
  assert.is(b, 1)
})

test('Else', () => {
  const a = evaluate(`if true {"x"} else {"y"}`)
  const b = evaluate(`if false {"x"} else {"y"}`)
  assert.is(a, 'x')
  assert.is(b, 'y')
})

test('Else if', () => {
  const a = evaluate(`if true {"x"} else if true {"y"} else {"z"}`)
  const b = evaluate(`if false {"x"} else if true {"y"} else {"z"}`)
  const c = evaluate(`if false {"x"} else if false {"y"} else {"z"}`)
  assert.is(a, 'x')
  assert.is(b, 'y')
  assert.is(c, 'z')
})

test('or', () => {
  const a = evaluate(`if false or true {"a"}`)
  const b = evaluate(`if true or false {"b"}`)
  const c = evaluate(`if false or false or true {"c"}`)
  const d = evaluate(`if false or false or false {"d"}`)
  assert.is(a, 'a')
  assert.is(b, 'b')
  assert.is(c, 'c')
  assert.is(d, undefined)
})
test('and', () => {
  const a = evaluate(`if true and true {"x"}`)
  const b = evaluate(`if 2 and 3 {"x"}`)
  const c = evaluate(`if true and false {"x"}`)
  assert.is(a, 'x')
  assert.is(b, 'x')
  assert.is(c, undefined)
})

test('includes (array)', () => {
  const a = evaluate(`let $items = ["one", "two"]\n$items includes "one"`)
  const b = evaluate(`let $items = ["one", "two"]\n$items includes "five"`)
  const c = evaluate(`let $items = ["one", "two"]\n$items includes 1`)
  const d = evaluate(`let $items = ["one", "two"]\n$items includes true`)
  const e = evaluate(`let $items = ["one", "two"]\n$items includes false`)
  const f = evaluate(`let $items = ["one", "two"]\n$items includes "ONE"`)
  assert.is(a, true)
  assert.is(b, false)
  assert.is(c, false)
  assert.is(d, false)
  assert.is(e, false)
  assert.is(f, false)
})

test('includes (string)', () => {
  const a = evaluate(`let $items = "one two"\n$items includes "one"`)
  const b = evaluate(`let $items = "one two"\n$items includes "five"`)
  const c = evaluate(`let $items = "one two"\n$items includes 1`)
  const d = evaluate(`let $items = "one two"\n$items includes true`)
  const e = evaluate(`let $items = "one two"\n$items includes false`)
  const f = evaluate(`let $items = "one two"\n$items includes "ONE"`)
  assert.is(a, true)
  assert.is(b, false)
  assert.is(c, false)
  assert.is(d, false)
  assert.is(e, false)
  assert.is(f, false)
})

test('matches (string, insensitive)', () => {
  const a = evaluate(`let $items = "one two"\n$items matches "one"`)
  const b = evaluate(`let $items = "one two"\n$items matches "five"`)
  const c = evaluate(`let $items = "one two"\n$items matches 1`)
  const d = evaluate(`let $items = "one two"\n$items matches true`)
  const e = evaluate(`let $items = "one two"\n$items matches false`)
  const f = evaluate(`let $items = "one two"\n$items matches "ONE"`)
  assert.is(a, true)
  assert.is(b, false)
  assert.is(c, false)
  assert.is(d, false)
  assert.is(e, false)
  assert.is(f, true)
})

test('"in" search', () => {
  const a = evaluate(`let $items = ["one", "two"]\n"one" in $items`)
  const b = evaluate(`let $items = ["one", "two"]\n"five" in $items`)
  const c = evaluate(`let $items = ["one", "two"]\n1 in $items`)
  const d = evaluate(`let $items = ["one", "two"]\ntrue in $items`)
  const e = evaluate(`let $items = ["one", "two"]\nfalse in $items`)
  const f = evaluate(`let $items = ["one", "two"]\n"ONE" in $items`)
  const g = evaluate(`let $color = "green"\n$color in ["red", "green", "blue"]`)
  const h = evaluate(`let $color = "green"\n$color in ["red", "orange", "blue"]`)
  assert.is(a, true)
  assert.is(b, false)
  assert.is(c, false)
  assert.is(d, false)
  assert.is(e, false)
  assert.is(f, false)
  assert.is(g, true)
  assert.is(h, false)
})

test.run()
