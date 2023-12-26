import { IToken, scanSource } from './scanner.js'
import { Token } from './tokens.js'

type VarRefPath = string[] | null
type VarRef = {
  position: number
  from: number
  to: number
  token: IToken
  type: 'ref' | 'user' | 'scope'
  userType?: 'string' | 'number' | 'boolean' | 'string[]' | 'number[]' | 'boolean[]' | string
  alias?: string
  path: VarRefPath
  pathLong: VarRefPath
}

export const extractDeclarations = (script: string) => {
  const refs: VarRef[] = []

  const stack = new Stacker<number, Omit<VarRef, 'from' | 'to' | 'pathLong'>>()
  stack.inc(0)

  const [ tokens ] = scanSource(script)
  const bucket = tokens.slice()

  const extractIdentMaybeAs = (): { source: IToken[], alias?: IToken } | undefined => {
    const source = extractIdentMaybeChain()
    if (!source) {
      return undefined
    }
    // const path = source.filter((t) => t.type !== Token.Dot).map((t) => t.lexeme)
    if (bucket[0].type === Token.As && bucket[1].type === Token.Identifier) {
      bucket.shift()
      const alias = bucket.shift()!
      return {
        source,
        alias,
      }
    }
    return {
      source,
    }
  }
  const extractIdentMaybeChain = (): IToken[] | undefined => {
    let idx = 0
    while (bucket[idx].type === Token.Identifier) {
      idx += 1
      if (bucket[idx].type === Token.Dot) {
        idx += 1
      }
    }
    if (idx > 0) {
      return bucket.splice(0, idx)
    }
    return undefined
  }
  const extractMaybeValueType = (): VarRef['userType'] => {
    if (bucket[1]?.type === Token.Ornament) {
      const hold = bucket.splice(0, 2)
      const v = extractMaybeValueType()
      bucket.unshift(...hold)
      return v
    }
    switch (bucket[0].type) {
      case Token.BoolLiteral: {
        return 'boolean'
      }
      case Token.NumberLiteral: {
        return 'number'
      }
      case Token.StringLiteral: {
        return 'string'
      }
      case Token.BraceLeft: {
        const hold = bucket.shift()!
        const v = extractMaybeValueType()
        bucket.unshift(hold)
        return v + '[]'
      }
      case Token.Ornament:
      case Token.Unique:
      case Token.Dot:
      case Token.Identifier: {
        const hold = bucket.shift()!
        const v = extractMaybeValueType()
        bucket.unshift(hold)
        return v
      }
      case Token.Lowercase:
      case Token.Uppercase:
      case Token.Trim:
      case Token.Reverse: {
        return 'string'
      }
      case Token.Characters:
      case Token.Words:
      case Token.Lines: {
        return 'string[]'
      }
      case Token.Length:
      case Token.Sum:
      case Token.Minimum:
      case Token.Maximum:
      case Token.Ceil:
      case Token.Floor:
      case Token.Round: {
        return 'number'
      }
    }
    return undefined
  }
  const pathFrom = (tokens: IToken[]) => {
    return tokens.filter((t) => t.type === Token.Identifier)
      .map((t) => t.lexeme)
  }

  while (bucket.length > 0) {
    const token = bucket.shift()
    if (!token) {
      break
    }
    if (token.type === Token.CurlyLeft) {
      stack.inc(token.offset)
      continue
    }
    if (token.type === Token.CurlyRight) {
      const frame = stack.pull()
      if (!frame) {
        continue
      }
      for (const item of frame.items) {
        refs.push({
          from: frame.scope,
          to: token.offset,
          pathLong: null,
          ...item,
        })
      }
      continue
    }
    if (token.type === Token.Take) {
      const idents: Omit<VarRef, 'from' | 'to' | 'pathLong'>[] = []
      if (bucket[0]?.type === Token.CurlyLeft) {
        let next: IToken | undefined = bucket.shift()
        while (next && next.type !== Token.CurlyRight) {
          const id = extractIdentMaybeAs()
          if (id) {
            idents.push({
              path: pathFrom(id.source),
              position: id.source[0].offset,
              token: id.alias ?? id.source[0],
              type: 'ref',
              alias: id.alias?.lexeme ?? id.source[0].lexeme,
            })
          } else {
            next = bucket.shift()
          }
        }
      } else {
        const id = extractIdentMaybeAs()
        if (id) {
          idents.push({
            position: id.source[0].offset,
            path: pathFrom(id.source),
            token: id.alias ?? id.source[0],
            type: 'ref',
            alias: id.alias?.lexeme ?? id.source[0].lexeme,
          })
        } else {
          bucket.shift()
        }
      }
      let basePath: VarRefPath = null
      if (bucket[0].type === Token.From) {
        bucket.shift()
        const from = extractIdentMaybeChain()
        if (from) {
          basePath = pathFrom(from)
        }
      } else {
        const frames = stack.export()
        const scope = frames.map((f) => f.items).flat().find((i) => i.type === 'scope')
        if (scope?.path) {
          basePath = [ ...scope.path ]
        }
      }
      for (const ident of idents) {
        let path = basePath
        if (ident.path && path) {
          path = [ ...path, ...ident.path ]
        }
        stack.push({
          ...ident,
          path,
        })
      }
    }
    if (token.type === Token.Each) {
      let source = extractIdentMaybeChain()
      if (!source) {
        continue
      }
      let ident
      if (bucket[0]?.type === Token.Of) {
        bucket.shift()
        ident = source
        source = extractIdentMaybeChain()
        if (!source) {
          continue
        }
      }
      if (bucket[0]?.type === Token.As) {
        bucket.shift()
        const id = bucket.shift()
        if (id) {
          ident = [ id ]
        }
      }
      if (bucket[0]?.type === Token.CurlyLeft) {
        const c = bucket.shift()!
        stack.inc(c.offset)
      }
      stack.push({
        position: source[0].offset,
        path: pathFrom(source).concat('#'),
        token: source[0],
        type: 'scope',
      })
      if (!ident) {
        continue
      }
      stack.push({
        position: ident[0].offset,
        path: pathFrom(source).concat('#'),
        token: ident[0],
        type: 'ref',
        alias: ident[0].lexeme,
      })
      continue
    }
    if (token.type === Token.Let) {
      if (bucket[0].type !== Token.Identifier) {
        continue
      }
      const ident = bucket.shift()
      if (!ident) {
        continue
      }
      if (bucket.shift()?.type !== Token.Assign) {
        continue
      }
      const val = extractIdentMaybeChain()
      const userType = extractMaybeValueType()
      stack.push({
        path: val ? pathFrom(val) : null,
        position: ident.offset,
        token: ident,
        type: val && !userType ? 'ref' : 'user',
        alias: ident.lexeme,
        userType,
      })
    }
  }

  let frame
  while ((frame = stack.pull()) !== undefined) {
    for (const item of frame.items) {
      refs.push({
        from: frame.scope,
        to: script.length,
        pathLong: null,
        ...item,
      })
    }
  }
  refs.sort((a, b) => a.position - b.position)
  for (const ref of refs) {
    let pathLong = ref.path
    while (true) {
      const p = pathLong?.[0]
      if (!p) {
        break
      }
      const other = refs.find((r) => {
        return r.alias === p
          && r.from <= ref.position
          && r.to >= ref.position
      })
      if (!other) {
        break
      }
      if (!other.path || other.type === 'user') {
        pathLong = null
        break
      }
      pathLong = [ ...other.path, ...pathLong!.slice(1) ]
    }
    ref.pathLong = pathLong
  }
  return refs
}

class Stacker<S, T> {
  private _stack: Array<{ scope: S, items: T[] }> = []
  constructor () {}

  public inc (scope: S) {
    this._stack.push({
      scope,
      items: [],
    })
  }

  public push (item: T) {
    const frame = this._stack[this._stack.length - 1]
    if (!frame) {
      throw new Error('No frame')
    }
    frame.items.push(item)
  }

  public pull () {
    return this._stack.pop()
  }

  public export () {
    return this._stack.slice().reverse()
  }
}
