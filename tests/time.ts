import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { evaluate } from '../src'

const SECOND = 1_000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const MONTH = 30 * DAY
const YEAR = 365 * DAY

/**
 * @note This is maybe a stupid idea, really - it might be better to inject
 *    time constants into the global scope rather than do this wonky measurement
 *    interpretation stuff, like I do normally with JS, or even in these tests
 *
 * Some ideas:
 *
 * # "@" prefix to reference global constants
 * `4 * @day`
 *
 * # Using :ornament notation to multiply a number
 * `4:days`
 *
 * The ornament idea seems kind of cool. Feels like more needless overhead since
 * it would just expand to multiplication behind the scenes, but it reads nicer
 * than a multiplication expression
 */

test('units: seconds', () => {
  // assert.is(evaluate('1s'), 1 * SECOND)
  // assert.is(evaluate('1 sec'), 1 * SECOND)
  assert.is(evaluate('1second'), 1 * SECOND)
  assert.is(evaluate('1seconds'), 1 * SECOND)
  assert.is(evaluate('1 second'), 1 * SECOND)
  assert.is(evaluate('1 seconds'), 1 * SECOND)
})

test('units: minutes', () => {
  // assert.is(evaluate('2m'), 2 * MINUTE)
  // assert.is(evaluate('2 min'), 2 * MINUTE)
  // assert.is(evaluate('2 mins'), 2 * MINUTE)
  assert.is(evaluate('2minute'), 2 * MINUTE)
  assert.is(evaluate('2minutes'), 2 * MINUTE)
  assert.is(evaluate('2 minute'), 2 * MINUTE)
  assert.is(evaluate('2 minutes'), 2 * MINUTE)
})

test('units: hours', () => {
  // assert.is(evaluate('3h'), 3 * HOUR)
  // assert.is(evaluate('3hr'), 3 * HOUR)
  // assert.is(evaluate('3hrs'), 3 * HOUR)
  // assert.is(evaluate('3 hr'), 3 * HOUR)
  // assert.is(evaluate('3 hrs'), 3 * HOUR)
  assert.is(evaluate('3hour'), 3 * HOUR)
  assert.is(evaluate('3hours'), 3 * HOUR)
  assert.is(evaluate('3 hour'), 3 * HOUR)
  assert.is(evaluate('3 hours'), 3 * HOUR)
})

test('units: days', () => {
  // assert.is(evaluate('4d'), 4 * DAY)
  // assert.is(evaluate('4 d'), 4 * DAY)
  assert.is(evaluate('4day'), 4 * DAY)
  assert.is(evaluate('4days'), 4 * DAY)
  assert.is(evaluate('4 day'), 4 * DAY)
  assert.is(evaluate('4 days'), 4 * DAY)
})

test('units: weeks', () => {
  // assert.is(evaluate('5w'), 5 * WEEK)
  // assert.is(evaluate('5wk'), 5 * WEEK)
  // assert.is(evaluate('5wks'), 5 * WEEK)
  assert.is(evaluate('5week'), 5 * WEEK)
  assert.is(evaluate('5weeks'), 5 * WEEK)
  // assert.is(evaluate('5 w'), 5 * WEEK)
  // assert.is(evaluate('5 wk'), 5 * WEEK)
  // assert.is(evaluate('5 wks'), 5 * WEEK)
  assert.is(evaluate('5 week'), 5 * WEEK)
  assert.is(evaluate('5 weeks'), 5 * WEEK)
})

test('units: months', () => {
  // assert.is(evaluate('6mo'), 6 * MONTH)
  // assert.is(evaluate('6mos'), 6 * MONTH)
  assert.is(evaluate('6month'), 6 * MONTH)
  assert.is(evaluate('6months'), 6 * MONTH)
  // assert.is(evaluate('6 mo'), 6 * MONTH)
  // assert.is(evaluate('6 mos'), 6 * MONTH)
  assert.is(evaluate('6 month'), 6 * MONTH)
  assert.is(evaluate('6 months'), 6 * MONTH)
})

test('units: years', () => {
  // assert.is(evaluate('7y'), 7 * YEAR)
  // assert.is(evaluate('7yr'), 7 * YEAR)
  // assert.is(evaluate('7yrs'), 7 * YEAR)
  assert.is(evaluate('7year'), 7 * YEAR)
  assert.is(evaluate('7years'), 7 * YEAR)
  // assert.is(evaluate('7 y'), 7 * YEAR)
  // assert.is(evaluate('7 yr'), 7 * YEAR)
  // assert.is(evaluate('7 yrs'), 7 * YEAR)
  assert.is(evaluate('7 year'), 7 * YEAR)
  assert.is(evaluate('7 years'), 7 * YEAR)
})

test('unit comparison', () => {
  assert.is(evaluate('1 day > 1 hour'), true)
  assert.is(evaluate('2 minutes < 3 minutes'), true)
  assert.is(evaluate('1 second < 2 seconds'), true)
  assert.is(evaluate('1 second > 0 seconds'), true)
  assert.is(evaluate('1 second == 1 seconds'), true)
  assert.is(evaluate('1 second < 1 minute'), true)
  assert.is(evaluate('1 minute < 1 hour'), true)
  assert.is(evaluate('1 hour < 1 day'), true)
  assert.is(evaluate('1 day < 1 week'), true)
  assert.is(evaluate('1 week < 1 month'), true)
  assert.is(evaluate('1 month < 1 year'), true)
  assert.is(evaluate('60 seconds == 1 minute'), true)
  assert.is(evaluate('60 minutes == 1 hour'), true)
  assert.is(evaluate('24 hours == 1 day'), true)
  assert.is(evaluate('7 days == 1 week'), true)
})

test('unit math', () => {
  assert.is(evaluate('5 days - 4 days'), 1 * DAY)
  assert.is(evaluate('5 days - 4 days == 1 day'), true)
  assert.is(evaluate('5 hours - 60 minutes'), 4 * HOUR)
  assert.is(evaluate('5 hours - 60 minutes > 1 hour'), true)
  assert.is(evaluate('1 hour / 2 == 0.5 hours'), true)
  assert.is(evaluate('1 hour / 2 == 30 minutes'), true)
})

test('unit math with variables', () => {
  assert.is(evaluate('let $n = 2\n$n days - 1 day == 1 day'), true)
  assert.is(evaluate('let $n = 2\n$n days + 1 day == 3 days'), true)
  assert.is(evaluate('(2 + 3) days == 5 days'), true)
})

test('date math with variables', () => {
  assert.is(evaluate('let $n = 2\nlet $t = now\n$t + $n days == $t + 2 days'), true)
  assert.is(evaluate('let $n = 2\nlet $t = now\n$t - $n days == $t - 2 days'), true)
})

test('date math with month adjustments', () => {
  assert.is(evaluate('let $n = $date + 1 month $n:month', { $date: new Date(2024, 2, 1) }), 4)
  assert.is(evaluate('let $n = $date + 1 month $n:month', { $date: new Date(2024, 2, 31) }), 4)
  assert.is(evaluate('let $n = $date + 1 month $n:day', { $date: new Date(2024, 2, 31) }), 30)

  assert.is(evaluate('let $n = $date - 1 month $n:month', { $date: new Date(2024, 3, 30) }), 3)
  assert.is(evaluate('let $n = $date - 1 month $n:day', { $date: new Date(2024, 3, 30) }), 30)

  assert.is(evaluate('let $n = $date - 1 month $n:month', { $date: new Date(2024, 2, 31) }), 2)
  assert.is(evaluate('let $n = $date - 1 month $n:day', { $date: new Date(2024, 2, 31) }), 29)

  assert.is(evaluate('let $n = $date - 1 month $n:month', { $date: new Date(2024, 2, 1) }), 2)
  assert.is(evaluate('let $n = $date - 1 month $n:day', { $date: new Date(2024, 2, 1) }), 1)

  assert.is(evaluate('let $n = $date + 12 months $n:month', { $date: new Date(2024, 1, 29) }), 2)
  assert.is(evaluate('let $n = $date + 12 months $n:day', { $date: new Date(2024, 1, 29) }), 28)
})

test('dates', () => {
  assert.is(evaluate('1 day ago < now'), true)
  assert.is(evaluate('1 day ahead > now'), true)
  assert.is(evaluate('now + 2 days > now'), true)
  assert.is(evaluate('now - 2 days < now'), true)
})

test('date ornaments', () => {
  const dt = new Date()
  assert.is(evaluate('now:year'), dt.getFullYear())
  assert.is(evaluate('now:month'), dt.getMonth() + 1)
  assert.is(evaluate('now:day'), dt.getDate())
  assert.is(evaluate('(now - 10 years):year'), dt.getFullYear() - 10)
  assert.is(evaluate('(now + 10 years):year'), dt.getFullYear() + 10)

  const data = {
    $release_date: new Date(2023, 5, 4), // 2023-06-04
  }
  assert.is(evaluate('$release_date:year == 2023', data), true)
  assert.is(evaluate('$release_date:month == 6', data), true)
  assert.is(evaluate('$release_date:day == 4', data), true)
})

test('time ornaments', () => {
  const data = { $dt: new Date(2020, 0, 1, 13, 45, 15) }
  assert.is(evaluate('$dt:hour == 13', data), true)
  assert.is(evaluate('$dt:minute == 45', data), true)
  assert.is(evaluate('$dt:second == 15', data), true)
})

test.skip('large-scale date math', () => {
  const data = {
    $release_date: new Date(2023, 5, 4),
  }
  assert.is(evaluate('let $date = $release_date - 5 months - 3 days\n$date:year+"-"+$date:month+"-"+$date:day', data), '2023-1-1')
})

test.run()
