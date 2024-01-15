import { suite } from 'uvu'
import * as assert from 'uvu/assert'
import { validate } from '../src/index.js'

positioning: {
  const t = suite('positioning')
  const run = (script: string, subjectData = {}) => {
    const results = validate(script, subjectData, { analyze: true, ignoreErrors: true })
    const inspect = results.trace.find((t) => t.node.inspect !== undefined)
    return { results, inspect }
  }

  const subjectData = {
    $things: [
      {
        $name: 'one',
        $value: 1,
      },
      {
        $name: 'two',
        $value: 2,
      },
    ],
  }
  const scenarios = [
    '\0let $x = 0?',
    '\0let $x? = 0',
    'let $x = \x001 + 1?',
    '\0let $x = 1 + 1??',
    'let $x = \0{ 1 + 1 }?',
    'let $x = 1 or \x00(2 or 3)?',
    'let $x = \x001 or (2 or 3)??',
    '\0let $x = 1 or (2 or 3)???',
    'let $x = if true { "a" } else \0{ "b" }?',
    'let $x = \0if true { "a" } else { "b" }??',
    '\0let $x = if true { "a" } else { "b" }???',

    '\0!true?',
    '!\0$things?',
    '\0!$things??',
    '!\0!!$things???',
    '\0!!!$things????',

    'let $x = 1 \0$x? += 1',
    'let $x = 0 \0$x += 1?',

    '\0$things?',

    'each \0$things? {}',
    'each \0$things? as $thing {}',
    // 'each $things as \0$thing? {}',
    // 'each \0$thing? of $things {}',
    // 'each $thing of \0$things? {}',
    'each $things { take \0$name? }',
    'each $things { take { $name, \0$value? } }',
    'each $things { take { $name } \0$name? }',
    // @todo Is this really expected?
    'each $things \0{ take { $name } $name }?',
    '\0each $things { take { $name } $name }??',
    'each $things { index > 0 and \0index < 1? }',
    'each $things { index > 0 and 1 > \0index? }',
    'each $things { index > 0 and \x001 > index?? }',
    'each $things { \0index > 0 and 1 > index??? }',
    'each $things { \0index > 0 and index < 1?? }',
    'each $things { \0index > 0? and index < 1 }',
    'each $things { \0index? > 0 and index < 1 }',
    'each $things { index > 0 and \0index? < 1 }',
    'each $things { index > 0 and index?? < 1 }',

    'each $things as $thing { \0$thing.$value? }',
    'each $things as $thing { $thing?.$value }',

    'let $x = \0[ 1, 2, 3 ]?:unique:reverse:sum',
    'let $x = \0[ 1, 2, 3 ]:unique?:reverse:sum',
    'let $x = \0[ 1, 2, 3 ]:unique:reverse?:sum',
    'let $x = \0[ 1, 2, 3 ]:unique:reverse:sum?',
    '\0let $x = [ 1, 2, 3 ]:unique:reverse:sum??',

    'let $x = { { { { "a"? } } } }',
    'let $x = { { { \0{ "a" }? } } }',
    'let $x = { { \0{ { "a" } }? } }',
    'let $x = { \0{ { { "a" } } }? }',
    'let $x = \0{ { { { "a" } } } }?',
    '\0let $x = { { { { "a" } } } }??',

    '\x001 + 2? - 3 * 4 / 5',
    '1 + 2 - 3? * 4 / 5',
    '1 + 2 - \x003 * 4? / 5',
    '1 + 2 - \x003 * 4 / 5?',
    '\x001 + 2 - 3 * 4 / 5??',
    '1 - 2 + \x003 / 4 * 5?',
    '\x001 - 2 + 3 / 4 * 5??',
    '1 + \0(2 + 3)? + ((4 + 5) + (6 + 7))',
    '1 + (2 + 3) + (\0(4 + 5)? + (6 + 7))',
    '1 + (2 + 3) + ((4 + 5) + \0(6 + 7)?)',
    '1 + (2 + 3) + (\0(4 + 5) + (6 + 7)??)',
    '1 + (2 + 3) + \0((4 + 5) + (6 + 7))?',
    '\x001 + (2 + 3) + ((4 + 5) + (6 + 7))??',

    '\0today?',
    '\0today:month?',
    '\0today?:month',
    'today + \x002 days?',
    '\0today + 2 days??',
    'today - \x002 days ago?',
    '\0today - 2 days ago??',
  ]
  for (const scenario of scenarios) {
    t(scenario, () => {
      const idx = scenario.indexOf('\0')
      const script = scenario.replace(/\0/g, '')
      const { results, inspect } = run(script, subjectData)
      if (idx >= 0) {
        assert.is(inspect?.node.start, idx)
      } else {
        assert.type(inspect, 'undefined')
      }
      assert.is(results.diagnostics.length, 0)
    })
  }
  t.run()
}
