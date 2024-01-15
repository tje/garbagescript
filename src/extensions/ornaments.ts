type OrnamentFn = (input: any) => any

export interface CustomOrnament {
  fn: OrnamentFn
  [key: string]: any
}

class OrnamentRegistry {
  private _ornaments = new Map<string, CustomOrnament>()

  public register (key: string, ornament: CustomOrnament | OrnamentFn) {
    if (!key.match(/^[a-z][a-z_]*$/)) {
      throw new Error(`Invalid ornament key: "${key}"`)
    }
    const entry = typeof ornament === 'function'
      ? { fn: ornament }
      : ornament
    this._ornaments.set(key, entry)
    return this
  }

  public unregister (key: string) {
    this._ornaments.delete(key)
    return this
  }

  public keys () {
    return this._ornaments.keys()
  }

  public get (key: string): CustomOrnament | undefined {
    return this._ornaments.get(key)
  }
}

export const GlobalOrnaments = new OrnamentRegistry()
