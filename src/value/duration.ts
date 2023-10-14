import { GasValue } from './value.js'

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
