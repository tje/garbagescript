import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { validate } from '../src'

const ev = (script: string, subjectData?: any) => {
  return validate(script, subjectData).diagnostics.map((d) => d.message)
}

test('mismatched type compare', () => {
  const evm = (s: string) => ev(s).find((d) => d.match(/expected matching types/i))
  const testValues = [ '1', '"1"', 'true', '[]', '1 day' ]
  const ops = [ '>', '<', '>=', '<=', '==', '!=' ]
  for (const tv of testValues) {
    for (const tv2 of testValues) {
      if (tv === tv2) {
        continue
      }
      for (const op of ops) {
        assert.type(evm(`${tv} ${op} ${tv2}`), 'string')
      }
    }
  }
})

test('compare dates', () => {
  assert.equal(ev('1 year / 2'), [])
  assert.equal(ev('1 month > 1 day'), [])
  assert.equal(ev('2 years < 1 year'), [])
})

test.run()
