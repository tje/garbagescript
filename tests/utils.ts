import { suite } from 'uvu'
import * as assert from 'uvu/assert'
import { extractDeclarations } from '../src/utils.js'

(() => {
  const test = suite('var collection')

  test('top level', () => {
    const script = `
      let $x = "sup"
    `
    const vars = extractDeclarations(script)
    assert.equal(vars?.[0]?.path, null)
    assert.equal(vars?.[0]?.type, 'user')
    assert.equal(vars?.[0]?.alias, '$x')
  })

  test('ref', () => {
    const script = `
      let $x = $y
    `
    const vars = extractDeclarations(script)
    assert.equal(vars?.[0]?.path, [ '$y' ])
    assert.equal(vars?.[0]?.type, 'ref')
    assert.equal(vars?.[0]?.alias, '$x')
  })

  test('ref chain', () => {
    const script = `
      let $x = $y.$z
    `
    const vars = extractDeclarations(script)
    assert.equal(vars?.[0]?.path, [ '$y', '$z' ])
    assert.equal(vars?.[0]?.type, 'ref')
    assert.equal(vars?.[0]?.alias, '$x')
  })

  test('each scope', () => {
    const script = `
      each $things {}
    `
    const vars = extractDeclarations(script)
    assert.equal(vars?.[0]?.path, [ '$things', '#' ])
    assert.equal(vars?.[0]?.type, 'scope')
  })

  test('each .. as', () => {
    const script = `
      each $things as $thing {}
    `
    const vars = extractDeclarations(script)
    assert.equal(vars?.[0]?.path, [ '$things', '#' ])
    assert.equal(vars?.[0]?.type, 'scope')
    assert.equal(vars?.[1]?.path, [ '$things', '#' ])
    assert.equal(vars?.[1]?.type, 'ref')
    assert.equal(vars?.[1]?.alias, '$thing')
  })

  test('each .. in', () => {
    const script = `
      each $thing in $things {}
    `
    const vars = extractDeclarations(script)
    // Note these are in reverse order from "each .. as" because of alias order
    assert.equal(vars?.[0]?.path, [ '$things', '#' ])
    assert.equal(vars?.[0]?.type, 'ref')
    assert.equal(vars?.[0]?.alias, '$thing')
    assert.equal(vars?.[1]?.path, [ '$things', '#' ])
    assert.equal(vars?.[1]?.type, 'scope')
  })

  test('each + take', () => {
    const script = `
      each $things {
        take $name
      }
    `
    const vars = extractDeclarations(script)
    assert.equal(vars?.[0]?.path, [ '$things', '#' ])
    assert.equal(vars?.[0]?.type, 'scope')
    assert.equal(vars?.[1]?.path, [ '$things', '#', '$name' ])
    assert.equal(vars?.[1]?.type, 'ref')
    assert.equal(vars?.[1]?.alias, '$name')
  })

  test('each + take as', () => {
    const script = `
      each $things {
        take { $name as $alias }
      }
    `
    const vars = extractDeclarations(script)
    assert.equal(vars?.[0]?.path, [ '$things', '#' ])
    assert.equal(vars?.[0]?.type, 'scope')
    assert.equal(vars?.[1]?.path, [ '$things', '#', '$name' ])
    assert.equal(vars?.[1]?.type, 'ref')
    assert.equal(vars?.[1]?.alias, '$alias')
  })

  test('take from', () => {
    const script = `
      take { $email } from $user.$contact
    `
    const vars = extractDeclarations(script)
    assert.equal(vars?.[0]?.path, [ '$user', '$contact', '$email' ])
    assert.equal(vars?.[0]?.type, 'ref')
    assert.equal(vars?.[0]?.alias, '$email')
  })

  test('take as from', () => {
    const script = `
      take { $email as $alias } from $user.$contact
    `
    const vars = extractDeclarations(script)
    assert.equal(vars?.[0]?.path, [ '$user', '$contact', '$email' ])
    assert.equal(vars?.[0]?.type, 'ref')
    assert.equal(vars?.[0]?.alias, '$alias')
  })

  test('take as multi', () => {
    const script = `
      take { $email_address as $email, $phone_number as $phone } from $user.$contact
    `
    const vars = extractDeclarations(script)
    assert.equal(vars?.[0]?.path, [ '$user', '$contact', '$email_address' ])
    assert.equal(vars?.[0]?.type, 'ref')
    assert.equal(vars?.[0]?.alias, '$email')
    assert.equal(vars?.[1]?.path, [ '$user', '$contact', '$phone_number' ])
    assert.equal(vars?.[1]?.type, 'ref')
    assert.equal(vars?.[1]?.alias, '$phone')
  })

  test('each $item.$prop', () => {
    const script = `
      each $user.$roles {
      }
    `
    const vars = extractDeclarations(script)
    assert.equal(vars?.[0]?.path, [ '$user', '$roles', '#' ])
    assert.equal(vars?.[0]?.type, 'scope')
  })

  test('each nested unrelated', () => {
    const script = `
      each $users {
        each $games as $game {
        }
      }
    `
    const vars = extractDeclarations(script)
    assert.equal(vars?.[0]?.path, [ '$users', '#' ])
    assert.equal(vars?.[0]?.type, 'scope')
    assert.equal(vars?.[1]?.path, [ '$games', '#' ])
    assert.equal(vars?.[1]?.type, 'scope')
    assert.equal(vars?.[2]?.path, [ '$games', '#' ])
    assert.equal(vars?.[2]?.type, 'ref')
    assert.equal(vars?.[2]?.alias, '$game')
  })

  test('each nested related', () => {
    const script = `
      each $users {
        take $roles
        each $roles as $role {
        }
      }
    `
    const vars = extractDeclarations(script)
    assert.equal(vars?.[0]?.path, [ '$users', '#' ])
    assert.equal(vars?.[0]?.type, 'scope')
    assert.equal(vars?.[1]?.path, [ '$users', '#', '$roles' ])
    assert.equal(vars?.[1]?.type, 'ref')
    assert.equal(vars?.[1]?.alias, '$roles')
    assert.equal(vars?.[2]?.path, [ '$roles', '#' ])
    assert.equal(vars?.[2]?.type, 'scope')
    assert.equal(vars?.[3]?.path, [ '$roles', '#' ])
    assert.equal(vars?.[3]?.type, 'ref')
    assert.equal(vars?.[3]?.alias, '$role')
  })

  test('each nested related, no take', () => {
    const script = `
      each $users as $user {
        each $user.$roles as $role {
        }
      }
    `
    const vars = extractDeclarations(script)
    assert.equal(vars?.[0]?.path, [ '$users', '#' ])
    assert.equal(vars?.[0]?.type, 'scope')
    assert.equal(vars?.[1]?.path, [ '$users', '#' ])
    assert.equal(vars?.[1]?.type, 'ref')
    assert.equal(vars?.[1]?.alias, '$user')
    assert.equal(vars?.[2]?.path, [ '$user', '$roles', '#' ])
    assert.equal(vars?.[2]?.type, 'scope')
    assert.equal(vars?.[3]?.path, [ '$user', '$roles', '#' ])
    assert.equal(vars?.[3]?.type, 'ref')
    assert.equal(vars?.[3]?.alias, '$role')
  })

  test('long path', () => {
    const script = `
      each $users as $user {
        each $user.$profile.$settings as $setting {
          each $setting.$options {
            take $value
          }
        }
      }
    `
    const vars = extractDeclarations(script)
    const valueRef = vars.find((v) => v.alias === '$value')
    assert.equal(valueRef?.alias, '$value')
    assert.equal(valueRef?.path, [ '$setting', '$options', '#', '$value' ])
    assert.equal(valueRef?.pathLong, [
      '$users',
      '#',
      '$profile',
      '$settings',
      '#',
      '$options',
      '#',
      '$value',
    ])
  })

  test('long path, scope fitting', () => {
    const script = `
      each $users as $user {
        each $user.$profile.$settings as $setting {
          each $setting.$options {
            take $value
          }
        }
      }

      let $test = $value
    `
    const vars = extractDeclarations(script)
    const testRef = vars.find((v) => v.alias === '$test')
    assert.equal(testRef?.alias, '$test')
    assert.equal(testRef?.path, [ '$value' ])
    assert.equal(testRef?.pathLong, [ '$value' ])
  })

  test('refs to user vars do not have long path', () => {
    const script = `
      each $users as $user {
        each $user.$profile.$settings as $setting {
          let $x = "test"
          each $setting.$options {
            take $value
            let $test = $x
          }
        }
      }
    `
    const vars = extractDeclarations(script)
    const testRef = vars.find((v) => v.alias === '$test')
    assert.equal(testRef?.alias, '$test')
    assert.equal(testRef?.path, [ '$x' ])
    assert.equal(testRef?.pathLong, null)
  })

  const userTypeTests = [
    [ '"test"', 'string' ],
    [ '100', 'number' ],
    [ 'true', 'boolean' ],
    [ '[1]', 'number[]' ],
    [ '["test"]', 'string[]' ],
    [ '[true]', 'boolean[]' ],
    [ '"test":characters', 'string[]' ],
    [ '"test":length', 'number' ],
    [ 'today', 'timestamp' ],
    [ 'today:year', 'number' ],
  ]
  for (const [ val, expected ] of userTypeTests) {
    test(`user type: ${val} == ${expected}`, () => {
      const vars = extractDeclarations(`let $x = ${val}`)
      assert.equal(vars?.[0]?.alias, '$x')
      assert.equal(vars?.[0]?.type, 'user')
      assert.equal(vars?.[0]?.userType, expected)
    })
  }
  const userTypeOrnTests = [
    [ '"test"', 'lines', 'string[]' ],
    [ '[1, 2]', 'length', 'number' ],
    [ '50', 'round', 'number' ],
  ]
  for (const [ val, orn, expected ] of userTypeOrnTests) {
    test(`user type (var + ornament): ${val}:${orn} == ${expected}`, () => {
      const vars = extractDeclarations(`let $x = ${val}\nlet $y = $x:${orn}`)
      assert.equal(vars?.[0]?.alias, '$x')
      assert.equal(vars?.[0]?.type, 'user')
      assert.equal(vars?.[1]?.alias, '$y')
      assert.equal(vars?.[1]?.type, 'user')
      assert.equal(vars?.[1]?.userType, expected)
    })
  }

  test('positioning', () => {
    const script = `
      each $things as $thing {
        take { $name }
        let $words = $name:words
        each $words as $word {
          if $word == "" {
            reject $name
            because "Test"
          }
        }
      }
    `
    const vars = extractDeclarations(script)

    const wordsRef = vars.find((v) => v.type === 'user' && v.alias === '$words')
    const wordsIdx = script.indexOf('$words')
    assert.not.equal(wordsIdx, -1)
    assert.equal(wordsRef?.position, wordsIdx)

    const wordRef = vars.find((v) => v.type === 'ref' && v.alias === '$word')
    const wordIdx = script.indexOf('$word ')
    assert.not.equal(wordIdx, -1)
    assert.equal(wordRef?.position, wordIdx)
  })

  test.run()
})()
