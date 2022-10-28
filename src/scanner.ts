import { Token, MATCHER } from './tokens'

export function scanSource (source: string) {
  let tokens = extractTokens(source)
  tokens = discardTokens(tokens)
  return tokens
}

export function extractTokens (source: string) {
  const tokens: IToken[] = []
  const errs: Array<{ col: number, ln: number, msg: string }> = []
  let hadErr = false

  let position = 0

  loop: while (position < source.length) {
    const slice = source.slice(position)
    for (const [ type, pattern ] of Object.entries(MATCHER)) {
      const match = slice.match(pattern)
      if (match) {
        const lexeme = match[0]
        tokens.push({
          type: type as Token,
          lexeme,
          offset: (match.index ?? 0) + position,
        })
        position += lexeme.length
        hadErr = false
        continue loop
      }
    }
    if (hadErr === false) {
      const lastEol = tokens.slice().reverse().find((t) => t.type === Token.EOL)
      let ln = 0
      let col = position
      if (lastEol) {
        ln = tokens.filter((t) => t.type === Token.EOL).length
        col = position - lastEol.offset
      }
      errs.push({
        ln,
        col,
        msg: `Unknown token: ${slice.substring(0, 1)}`,
      })
      hadErr = true
    }
    position += 1
  }

  tokens.push({
    type: Token.EOF,
    lexeme: '',
    offset: position,
  })

  if (errs.length > 0) {
    const sourceLines = source.split(/\n/)
    for (const err of errs) {
      const ctxStart = Math.max(0, err.ln - 2)
      const ctxEnd = Math.min(sourceLines.length - -1, err.ln + 3)
      const ctxIdx = err.ln - ctxStart
      const ctx = sourceLines.slice(ctxStart, ctxEnd)
      ctx.splice(ctxIdx + 1, 0, ' '.repeat(Math.max(0, err.col - 1)) + '\x1b[31m^-- ' + err.msg + '\x1b[0m')
      console.error(`Error at line ${err.ln}, column ${err.col}:`)
      console.error(ctx.join('\n'))
    }
  }

  return tokens
}

function discardTokens (tokens: IToken[]): IToken[] {
  const eolSiblings = [
    Token.Divide,
    Token.Multiply,
    Token.Plus,
    Token.Minus,
    Token.PlusEquals,
    Token.MinusEquals,
    Token.Assign,
  ]
  return tokens
    .filter(({ type }) => type !== Token.Whitespace && type !== Token.Comment)
    .filter(({ type }, idx, a) => {
      if (type !== Token.EOL) {
        return true
      }
      const prev: IToken = a[idx - 1]
      const next: IToken = a[idx + 1]
      if (!prev || !next || prev.type === Token.EOL) {
        return false
      }
      const adjacentOp = eolSiblings.includes(prev.type)
        || eolSiblings.includes(next.type)
      return !adjacentOp
    })
}

export type IToken = {
  type: Token
  lexeme: string
  offset: number
}
