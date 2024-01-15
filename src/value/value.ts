type Unwrapped<T> =
    T extends GasValue ? Unwrapped<ReturnType<T['unwrap']>>
  : T extends Array<infer I> ? Unwrapped<I>[]
  : T extends Record<string, GasValue> ? { [K in keyof T]: Unwrapped<T[K]> }
  : T

type GasValueConstructor =
  | typeof GasArray
  | typeof GasBoolean
  | typeof GasDate
  | typeof GasDuration
  | typeof GasNumber
  | typeof GasString
  | typeof GasStruct
  | typeof GasUnknown

const enum GasValueOrd {
  Less = -1,
  Equal = 0,
  Greater = 1,
}

type GasValuePath = (string | number)[]
export abstract class GasValue<T = unknown> {
  protected _type: string = 'unknown'

  constructor (protected _value: T, protected _path: GasValuePath = []) {}

  public get type () {
    return this._type
  }

  public get path () {
    return this._path
  }

  abstract unwrap (): Unwrapped<T>

  abstract toDisplay (): string
  abstract toDebug (): string

  static from (value: any, path: GasValuePath = []) {
    if (typeof value === 'number') {
      return new GasNumber(value, path)
    }
    if (typeof value === 'string') {
      return new GasString(value, path)
    }
    if (typeof value === 'boolean') {
      return new GasBoolean(value, path)
    }
    if (value instanceof Date) {
      return new GasDate(value, path)
    }
    if (Array.isArray(value)) {
      const items = value.map((e, idx) => this.from(e, [ ...path, idx ])) as GasValue<unknown>[]
      return new GasArray(items, path)
    }
    if (value?.constructor === Object) {
      const rec: Record<string, GasValue> = {}
      for (const [ key, val ] of Object.entries(value)) {
        rec[key] = this.from(val, [ ...path, key ])
      }
      return new GasStruct(rec, path)
    }
    return new GasUnknown(value, path)
  }

  static isGasValue (v: any): v is GasValue {
    return v instanceof GasArray
      || v instanceof GasBoolean
      || v instanceof GasDate
      || v instanceof GasNumber
      || v instanceof GasString
      || v instanceof GasStruct
      || v instanceof GasDuration
      || v instanceof GasUnknown
  }

  public is <I extends GasValueConstructor> (type: I): this is InstanceType<I> {
    return this instanceof type
  }

  get inner (): T {
    return this._value
  }


  public add <T extends GasValue> (other: T): GasValue {
    const a = this.parse()
    const b = other.parse()
    if (a !== undefined && b !== undefined) {
      return new GasNumber(a + b)
    }
    return new GasUnknown(undefined)
  }
  public sub <T extends GasValue> (other: T): GasValue {
    const a = this.parse()
    const b = other.parse()
    if (a !== undefined && b !== undefined) {
      return new GasNumber(a - b)
    }
    return new GasUnknown(undefined)
  }
  public mul <T extends GasValue> (other: T): GasValue {
    const a = this.parse()
    const b = other.parse()
    if (a !== undefined && b !== undefined) {
      return new GasNumber(a * b)
    }
    return new GasUnknown(undefined)
  }
  public div <T extends GasValue> (other: T): GasValue {
    const a = this.parse()
    const b = other.parse()
    if (a !== undefined && b !== undefined) {
      return new GasNumber(a / b)
    }
    return new GasUnknown(undefined)
  }
  public mod <T extends GasValue> (other: T): GasValue {
    const a = this.parse()
    const b = other.parse()
    if (a !== undefined && b !== undefined) {
      return new GasNumber(a % b)
    }
    return new GasUnknown(undefined)
  }
  public parse (): number | undefined {
    return undefined
  }
  public cmp <T extends GasValue> (other: T): GasValueOrd | undefined {
    return undefined
  }
  public eq <T extends GasValue> (other: T): boolean {
    return this.cmp(other) === GasValueOrd.Equal
  }
}

export class GasUnknown extends GasValue<unknown> {
  public unwrap () {
    return this._value
  }
  public toDebug () {
    return `Unknown{${this.toDisplay()}}`
  }
  public toDisplay (): string {
    return String(this._value)
  }
  public cmp () {
    return GasValueOrd.Equal
  }
  public eq () {
    return false
  }
}

export class GasString extends GasValue<string> {
  protected _type = 'string'
  public unwrap (): string {
    return this._value
  }
  public toDebug () {
    return `"${this.toDisplay()}"`
  }
  public toDisplay (): string {
    return this.unwrap()
  }

  public add <T extends GasValue> (other: T): GasValue {
    if (other.is(GasString)) {
      return new GasString(this.inner + other.inner)
    }
    if (other.is(GasNumber)) {
      const v = this.parse()
      if (v !== undefined) {
        return new GasNumber(v + other.inner)
      }
    }
    return new GasString(this.inner + other.unwrap())
  }
  public cmp <T extends GasValue> (other: T): GasValueOrd | undefined {
    if (other.is(GasString)) {
      if (this.inner === other.inner) {
        return GasValueOrd.Equal
      }
      return this.inner > other.inner
        ? GasValueOrd.Greater
        : GasValueOrd.Less
    }
    return undefined
  }
  public eq <T extends GasValue> (other: T): boolean {
    if (other.is(GasString)) {
      return other.inner === this.inner
    }
    return false
  }
  public parse(): number | undefined {
    const v = parseFloat(this.inner)
    if (!isNaN(v)) {
      return v
    }
    return undefined
  }
}

export class GasNumber extends GasValue<number> {
  protected _type = 'number'
  public unwrap (): number {
    return this._value
  }
  public toDebug () {
    return this.toDisplay()
  }
  public toDisplay (): string {
    return this.inner.toString()
  }

  public add <T extends GasValue> (other: T): GasValue {
    const v = other.parse()
    if (v !== undefined) {
      return new GasNumber(this.inner + v)
    }
    return super.add(other)
  }
  public sub <T extends GasValue> (other: T): GasValue {
    const v = other.parse()
    if (v !== undefined) {
      return new GasNumber(this.inner - v)
    }
    return super.sub(other)
  }
  public mul <T extends GasValue> (other: T): GasValue {
    const v = other.parse()
    if (v !== undefined) {
      return new GasNumber(this.inner * v)
    }
    return super.mul(other)
  }
  public div <T extends GasValue> (other: T): GasValue {
    const v = other.parse()
    if (v !== undefined) {
      return new GasNumber(this.inner / v)
    }
    return super.div(other)
  }
  public mod <T extends GasValue> (other: T): GasValue {
    const v = other.parse()
    if (v !== undefined) {
      return new GasNumber(this.inner % v)
    }
    return super.mod(other)
  }

  public cmp <T extends GasValue> (other: T): GasValueOrd | undefined {
    const v = other.parse()
    if (v !== undefined) {
      if (this.inner === v) {
        return GasValueOrd.Equal
      }
      return this.inner > v
        ? GasValueOrd.Greater
        : GasValueOrd.Less
    }
    return undefined
  }
  public eq <T extends GasValue> (other: T): boolean {
    const v = other.parse()
    if (v !== undefined) {
      return v === this.inner
    }
    return false
  }
  public parse(): number | undefined {
    return this.inner
  }
}

export class GasBoolean extends GasValue<boolean> {
  protected _type = 'boolean'
  public unwrap (): boolean {
    return this._value
  }
  public toDebug () {
    return this.toDisplay()
  }
  public toDisplay (): string {
    return this.inner ? 'true' : 'false'
  }

  public cmp <T extends GasValue> (other: T): GasValueOrd | undefined {
    if (other.is(GasBoolean)) {
      if (other.inner === this.inner) {
        return GasValueOrd.Equal
      }
      return this.inner === true
        ? GasValueOrd.Greater
        : GasValueOrd.Less
    }
    return undefined
  }
  public eq <T extends GasValue> (other: T): boolean {
    return this.inner === other.inner
  }
}

export class GasArray<T extends GasValue> extends GasValue<T[]> {
  protected _type = 'array'
  get inner () {
    return this._value.slice()
  }
  public unwrap (): Unwrapped<T[]> {
    return this._value.map((e) => e.unwrap()) as Unwrapped<T[]>
  }

  public isItems <I extends GasValueConstructor> (type: I): this is GasArray<InstanceType<I>> {
    return this.inner.some((e) => !(e instanceof type)) === false
  }

  public toDebug () {
    return `[ ${this.inner.map((e) => e.toDebug()).join(', ')} ]`
  }
  public toDisplay (): string {
    return this.inner.map((e) => e.toDisplay()).join(', ')
  }

  public add <O extends GasValue> (other: O): GasValue {
    return new GasArray([
      ...this.unwrap(),
      ...[ other.unwrap() ].flat(1),
    ].map((e) => GasValue.from(e)))
  }
  public sub <O extends GasValue> (other: O): GasValue {
    const o = [other.unwrap()].flat(1)
    return new GasArray(
      this.unwrap().filter((e) => !o.includes(e))
        .map((e) => GasValue.from(e)),
    )
  }
}

export class GasStruct<T extends Record<string, GasValue>> extends GasValue<T> {
  protected _type = 'struct'
  public unwrap (): Unwrapped<T> {
    return Object.entries(this.inner)
      .reduce((acc, [ key, val ]) => {
        return {
          ...acc,
          [key]: val.unwrap(),
        }
      }, {} as Unwrapped<T>)
  }
  public toDebug () {
    const inner = Object.entries(this.inner)
      .map(([ key, val ]) => `  ${key}: ${val.toDebug().split('\n').map((l, i) => i !== 0 ? '  ' + l : l).join('\n')}`)
      .join('\n')
    return `Struct{\n${inner}\n}`
  }
  public toDisplay (): string {
    return '{..}'
  }
}

export class GasDate extends GasValue<Date> {
  protected _type = 'date'
  public unwrap (): Date {
    return this._value
  }
  public toDebug () {
    return this.inner.toISOString()
  }
  public toDisplay (): string {
    return this.inner.toLocaleString()
  }

  public add <T extends GasValue> (other: T): GasValue {
    if (other.is(GasDuration)) {
      return new GasDate(
        new Date(this.unwrap().getTime() + (other.unwrap() as number)),
      )
    }
    return super.add(other)
  }

  public sub <T extends GasValue> (other: T): GasValue {
    if (other.is(GasDuration)) {
      return new GasDate(
        new Date(this.unwrap().getTime() - (other.unwrap() as number)),
      )
    }
    if (other.is(GasDate)) {
      return new GasDuration(
        (this.inner.getTime() - other.inner.getTime()) / 1_000,
        DurationUnit.Second,
      )
    }
    return super.sub(other)
  }

  public cmp <T extends GasValue> (other: T): GasValueOrd | undefined {
    if (other.is(GasDate)) {
      const a = this.inner.getTime()
      const b = other.inner.getTime()
      if (a === b) {
        return GasValueOrd.Equal
      }
      return a > b
        ? GasValueOrd.Greater
        : GasValueOrd.Less
    }
  }
}


export enum DurationUnit {
  Second,
  Minute,
  Hour,
  Day,
  Week,
  Month,
  Year,
}


const SECOND = 1_000
const MINUTE = 60 * 1_000
const HOUR = 60 * 60 * 1_000
const DAY = 24 * 60 * 60 * 1_000
const WEEK = 7 * 24 * 60 * 60 * 1_000
const MONTH = 30 * 24 * 60 * 60 * 1_000
const YEAR = 365 * 24 * 60 * 60 * 1_000

export class GasDuration extends GasValue<number> {
  protected _type = 'duration'
  constructor (protected _value: number, private unit: DurationUnit, protected _path: GasValuePath = []) {
    super(_value, _path)
  }

  public unwrap (): number {
    return this._value * this._unitValue
  }

  private get _unitValue () {
    switch (this.unit) {
      case DurationUnit.Second: return SECOND
      case DurationUnit.Minute: return MINUTE
      case DurationUnit.Hour: return HOUR
      case DurationUnit.Day: return DAY
      case DurationUnit.Week: return WEEK
      case DurationUnit.Month: return MONTH
      case DurationUnit.Year: return YEAR
    }
  }

  public toJSON () {
    return this.unwrap()
  }

  public valueOf () {
    return this.unwrap()
  }

  [Symbol.toPrimitive] (_hint: string) {
    return this.unwrap()
  }

  public toDebug () {
    return `Duration{${this.inner}}`
  }

  public toDisplay (): string {
    const v = this.unwrap()
    const s = Math.abs(v)
    if (s >= YEAR) {
      return `${Math.round((v / YEAR) * 10) / 10} year(s)`
    }
    if (s >= MONTH) {
      return `${Math.round((v / MONTH) * 10) / 10} month(s)`
    }
    if (s >= DAY) {
      return `${Math.round((v / DAY) * 10) / 10} day(s)`
    }
    if (s >= HOUR) {
      return `${Math.round((v / HOUR) * 10) / 10} hour(s)`
    }
    if (s >= MINUTE) {
      return `${Math.round((v / MINUTE) * 10) / 10} minute(s)`
    }
    return `${Math.round((v / SECOND) * 10) / 10} second(s)`
  }

  public add <T extends GasValue> (other: T): GasValue {
    if (other.is(GasDuration)) {
      return new GasDuration(
        (this.unwrap() + (other.unwrap() as number)) / 1_000,
        DurationUnit.Second,
      )
    }
    return super.add(other)
  }
  public sub <T extends GasValue> (other: T): GasValue {
    if (other.is(GasDuration)) {
      return new GasDuration(
        (this.unwrap() - (other.unwrap() as number)) / 1_000,
        DurationUnit.Second,
      )
    }
    return super.sub(other)
  }
  public mul <T extends GasValue> (other: T): GasValue {
    if (other.is(GasNumber)) {
      return new GasDuration(
        this.inner * (other.unwrap() as number),
        this.unit,
      )
    }
    return super.mul(other)
  }
  public div <T extends GasValue> (other: T): GasValue {
    if (other.is(GasNumber)) {
      return new GasDuration(
        this.inner / (other.unwrap() as number),
        this.unit,
      )
    }
    return super.div(other)
  }
  public mod <T extends GasValue> (other: T): GasValue {
    if (other.is(GasNumber)) {
      return new GasDuration(
        this.inner % (other.unwrap() as number),
        this.unit,
      )
    }
    return super.mod(other)
  }

  public cmp <T extends GasValue> (other: T): GasValueOrd | undefined {
    if (other.is(GasDuration)) {
      const a = this.unwrap()
      const b = other.unwrap() as number
      if (a === b) {
        return GasValueOrd.Equal
      }
      return a > b
        ? GasValueOrd.Greater
        : GasValueOrd.Less
    }
    return undefined
  }
}
