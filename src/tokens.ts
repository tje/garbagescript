export enum Token {
  Whitespace = 'WHITESPACE',
  Comment = 'COMMENT',

  Plus = 'PLUS',
  Minus = 'MINUS',
  Multiply = 'MULTIPLY',
  Divide = 'DIVIDE',
  Equals = 'EQ',
  PlusEquals = 'PLUS_EQ',
  MinusEquals = 'MINUS_EQ',

  CurlyLeft = 'CURLY_L',
  CurlyRight = 'CURLY_R',

  Identifier = 'IDENT',
  NumberLiteral = 'NUMBER',
  StringLiteral = 'STRING',
  BoolLiteral = 'BOOL',

  EOL = 'EOL',
  EOF = 'EOF',
}

export const MATCHER = {
  [Token.EOL]: /^[\r\n;]/,
  [Token.Whitespace]: /^\s+/,
  [Token.Comment]: /^\/\/.*?(?=[\r\n])/,
  [Token.PlusEquals]: /^\+=/,
  [Token.MinusEquals]: /^-=/,
  [Token.Multiply]: /^\*/,
  [Token.Divide]: /^\\/,
  [Token.Plus]: /^\+/,
  [Token.Minus]: /^-/,
  [Token.Equals]: /^=/,
  [Token.CurlyLeft]: /^\{/,
  [Token.CurlyRight]: /^\}/,
  [Token.Identifier]: /^\$[a-zA-Z_\d]+/,
  [Token.NumberLiteral]: /^[\d]+[\d_]*(\.[\d_]*)?/,
  [Token.StringLiteral]: /^"(?:[^\\"]|\\(?:[bfnrtv"\\/]|u[0-9a-fA-F]{4}))*"/,
  [Token.BoolLiteral]: /^true|false/,
}
