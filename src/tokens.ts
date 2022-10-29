export enum Token {
  Whitespace = 'WHITESPACE',
  Comment = 'COMMENT',

  Plus = 'PLUS',
  Minus = 'MINUS',
  Multiply = 'MULTIPLY',
  Divide = 'DIVIDE',
  Equals = 'EQ',
  NotEquals = 'NOT_EQ',
  Greater = 'GT',
  Less = 'LT',
  GreaterEqual = 'GTE',
  LessEqual = 'LTE',
  Not = 'NOT',

  Let = 'LET',
  Assign = 'ASSIGN',
  PlusEquals = 'PLUS_EQ',
  MinusEquals = 'MINUS_EQ',
  MultiplyEquals = 'MULT_EQ',
  DivideEquals = 'DIV_EQ',

  CurlyLeft = 'CURLY_L',
  CurlyRight = 'CURLY_R',
  ParenLeft = 'PAREN_L',
  ParenRight = 'PAREN_R',

  Identifier = 'IDENT',
  NumberLiteral = 'NUMBER',
  StringLiteral = 'STRING',
  BoolLiteral = 'BOOL',

  EOL = 'EOL',
  EOF = 'EOF',

  Print = 'PRINT',
  If = 'IF',
  Else = 'ELSE',
}

export const MATCHER = {
  [Token.EOL]: /^[\r\n;]/,
  [Token.Whitespace]: /^[ \t]+/,
  [Token.Comment]: /^\/\/.*?(?=[\r\n])/,
  [Token.PlusEquals]: /^\+=/,
  [Token.MinusEquals]: /^-=/,
  [Token.MultiplyEquals]: /^\*=/,
  [Token.DivideEquals]: /^\/=/,
  [Token.Equals]: /^==/,
  [Token.NotEquals]: /^\!=/,
  [Token.GreaterEqual]: /^\>=/,
  [Token.LessEqual]: /^\<=/,
  [Token.Greater]: /^\>/,
  [Token.Less]: /^\</,
  [Token.Not]: /^\!/,
  [Token.Multiply]: /^\*/,
  [Token.Divide]: /^\//,
  [Token.Plus]: /^\+/,
  [Token.Minus]: /^-/,
  [Token.Assign]: /^=/,
  [Token.CurlyLeft]: /^\{/,
  [Token.CurlyRight]: /^\}/,
  [Token.ParenLeft]: /^\(/,
  [Token.ParenRight]: /^\)/,
  [Token.Let]: /^let\b/,
  [Token.Identifier]: /^\$[a-zA-Z_\d]+/,
  [Token.NumberLiteral]: /^[\d]+[\d_]*(\.[\d_]*)?/,
  [Token.StringLiteral]: /^"(?:[^\\"]|\\(?:[bfnrtv"\\/]|u[0-9a-fA-F]{4}))*"/,
  [Token.BoolLiteral]: /^(true|false)/,

  [Token.Print]: /^print/,
  [Token.If]: /^if\b/,
  [Token.Else]: /^else\b/,
}
