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
}

export class GasString extends GasValue<string> {
  protected _type = 'string'
  public unwrap (): string {
    return this._value
  }
}

export class GasNumber extends GasValue<number> {
  protected _type = 'number'
  public unwrap (): number {
    return this._value
  }
}

export class GasBoolean extends GasValue<boolean> {
  protected _type = 'boolean'
  public unwrap (): boolean {
    return this._value
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
  // public isNumbers (): this is GasArray<GasNumber> {
  //   return this.inner.some((e) => !(e instanceof GasNumber)) === false
  // }
  // public isStrings (): this is GasArray<GasString> {
  //   return this.inner.some((e) => !(e instanceof GasString)) === false
  // }
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
}

export class GasDate extends GasValue<Date> {
  protected _type = 'date'
  public unwrap (): Date {
    return this._value
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
      case DurationUnit.Second: return 1_000
      case DurationUnit.Minute: return 60 * 1_000
      case DurationUnit.Hour: return 60 * 60 * 1_000
      case DurationUnit.Day: return 24 * 60 * 60 * 1_000
      case DurationUnit.Week: return 7 * 24 * 60 * 60 * 1_000
      case DurationUnit.Month: return 30 * 24 * 60 * 60 * 1_000
      case DurationUnit.Year: return 365 * 24 * 60 * 60 * 1_000
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
}
