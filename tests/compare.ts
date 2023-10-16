import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { evaluate } from '../src'

const cases = [
  // Strings
  [ '"a" == "a"', true ],
  [ '"a" == "b"', false ],
  [ '"a" != "a"', false ],
  [ '"a" != "b"', true ],
  [ '"A" == "a"', false ],
  [ '"A" == "b"', false ],
  [ '"A" != "a"', true ],
  [ '"A" != "b"', true ],

  [ '"a" > "b"', false ],
  [ '"a" < "b"', true ],
  [ '"A" > "a"', false ],
  [ '"A" < "a"', true ],
  [ '"a" >= "b"', false ],
  [ '"a" <= "b"', true ],
  [ '"a" >= "a"', true ],
  [ '"a" <= "a"', true ],

  // Numbers
  [ '1 == 1', true ],
  [ '1 == 2', false ],
  [ '1 != 1', false ],
  [ '1 != 2', true ],
  [ '1 > 1', false ],
  [ '1 < 1', false ],
  [ '1 > 2', false ],
  [ '1 < 2', true ],
  [ '1 >= 1', true ],
  [ '1 <= 1', true ],
  [ '1 >= 2', false ],
  [ '1 <= 2', true ],
] as [string, any][]

for (const [ script, answer ] of cases) {
  test(script, () => {
    assert.equal(evaluate(script), answer)
  })
}
test.run()
