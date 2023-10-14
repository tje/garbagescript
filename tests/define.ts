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

test('money (w/ fixed decimal + thousands)', () => {
  const pre = `
    define :money {
      take $input
      let $s = "" + (((1 + $input) * 100):round - 100)
      if $s:length == 1 {
        $s = "00" + $s
      } else if $s:length == 2 {
        $s = "0" + $s
      }
      let $o = ""
      let $t = 0
      each $c of $s:characters:reverse {
        if $o:length > 3 {
          $t += 1
          if $t % 3 == 0 {
            $o += ","
          }
        }
        $o += $c
        if $o:length == 2 {
          $o += "."
        }
      }
      "$" + $o:reverse
    }
  `
  const ev = (n: string) => evaluate(`${pre}\n${n}:money`)
  assert.is(ev('123.000001'), '$123.00')
  assert.is(ev('1'), '$1.00')
  assert.is(ev('010.0'), '$10.00')
  assert.is(ev('0'), '$0.00')
  assert.is(ev('1111'), '$1,111.00')
  assert.is(ev('0000'), '$0.00')
  assert.is(ev('1000000'), '$1,000,000.00')
  assert.is(ev('0.5'), '$0.50')
  assert.is(ev('0.05'), '$0.05')
})

test('external ornaments', () => {
  const ornamentExtensions = {
    is_numeric: (i: any) => {
      if (typeof i === 'number') {
        return true
      }
      if (typeof i === 'string') {
        const n = parseFloat(i)
        return !isNaN(n) && isFinite(i)
      }
      return false
    },
    only_alpha: (i: any) => {
      const fn = (i: any) => {
        if (typeof i === 'string' || typeof i === 'number') {
          return String(i).replace(/[^a-zA-Z]/g, '')
        }
        return ''
      }
      return Array.isArray(i) ? i.map(fn) : fn(i)
    },
  }
  const ev = (script: string) => evaluate(script, undefined, { ornamentExtensions })
  assert.is(ev('"hello":is_numeric'), false)
  assert.is(ev('123:is_numeric'), true)
  assert.is(ev('"123":is_numeric'), true)
  assert.is(ev('false:is_numeric'), false)
  assert.is(ev('"abc":only_alpha'), 'abc')
  assert.is(ev('"123":only_alpha'), '')
  assert.is(ev('"a1b2c3":only_alpha'), 'abc')
  assert.equal(ev('["a",1,"b",2]:only_alpha'), ['a', '', 'b', ''])
})

test.run()
