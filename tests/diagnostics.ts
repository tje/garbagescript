import { test, suite } from 'uvu'
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

undef_vars: {
  const run = (script: string) => {
    return validate(script, {}, { ignoreErrors: true, analyze: true }).diagnostics
  }
  const t = suite('undefined variables')
  t('if true', () => {
    const res = run('if true { $one }')
    assert.equal(res.length, 1)
    assert.match(res[0].message, 'variable')
    assert.match(res[0].message, '$one')
  })
  t('if false', () => {
    const res = run('if false { $one }')
    assert.equal(res.length, 1)
    assert.match(res[0].message, 'variable')
    assert.match(res[0].message, '$one')
  })
  t('if true else', () => {
    const res = run('if true { 1 } else { $one }')
    assert.equal(res.length, 1)
    assert.match(res[0].message, 'variable')
    assert.match(res[0].message, '$one')
  })
  t('each empty', () => {
    const res = run('each [] { $one }')
    assert.equal(res.length, 1)
    assert.match(res[0].message, 'variable')
    assert.match(res[0].message, '$one')
  })
  t('each skip', () => {
    const res = run('each [1] { skip $one }')
    assert.equal(res.length, 1)
    assert.match(res[0].message, 'variable')
    assert.match(res[0].message, '$one')
  })
  t('each non-iterable', () => {
    const res = run('each 1 { $one }')
    assert.equal(res.length, 2)
    assert.match(res[0].message, 'iterable')
    assert.match(res[1].message, 'variable')
    assert.match(res[1].message, '$one')
  })
  t.run()
}

test.run()
