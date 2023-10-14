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

export abstract class GasValue<T = unknown> {
  protected _type: string = 'unknown'

  constructor (protected _value: T) {}

  public get type () {
    return this._type
  }

  abstract unwrap (): Unwrapped<T>

  abstract toDisplay (): string
  abstract toDebug (): string

  static from (value: any) {
    if (typeof value === 'number') {
      return new GasNumber(value)
    }
    if (typeof value === 'string') {
      return new GasString(value)
    }
    if (typeof value === 'boolean') {
      return new GasBoolean(value)
    }
    if (value instanceof Date) {
      return new GasDate(value)
    }
    if (Array.isArray(value)) {
      const items = value.map((e) => this.from(e)) as GasValue<unknown>[]
      return new GasArray(items)
    }
    if (value?.constructor === Object) {
      const rec: Record<string, GasValue> = {}
      for (const [ key, val ] of Object.entries(value)) {
        rec[key] = this.from(val)
      }
      return new GasStruct(rec)
    }
    return new GasUnknown(value)
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
    return `[ ${this.toDisplay()} ]`
  }
  public toDisplay (): string {
    return this.inner.map((e) => e.toDisplay()).join(', ')
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
      .map(([ key, val ]) => `${key}: ${val.toDisplay()}`)
      .join(', ')
    return `Struct{${inner}}`
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
  constructor (protected _value: number, private unit: DurationUnit) {
    super(_value)
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
}
