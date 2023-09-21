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
  Ornament = 'ORNAMENT',

  CurlyLeft = 'CURLY_L',
  CurlyRight = 'CURLY_R',
  ParenLeft = 'PAREN_L',
  ParenRight = 'PAREN_R',
  BraceLeft = 'BRACE_L',
  BraceRight = 'BRACE_R',
  Comma = 'COMMA',

  Identifier = 'IDENT',
  NumberLiteral = 'NUMBER',
  StringLiteral = 'STRING',
  BoolLiteral = 'BOOL',

  EOL = 'EOL',
  EOF = 'EOF',

  Print = 'PRINT',
  If = 'IF',
  Else = 'ELSE',
  Each = 'EACH',
  Of = 'OF',
  Includes = 'INCLUDES',
  Matches = 'MATCHES',
  Take = 'TAKE',
  From = 'FROM',
  Or = 'OR',
  And = 'AND',
  Reject = 'REJECT',
  Validate = 'VALIDATE',
  Today = 'TODAY',
  Any = 'ANY',
  All = 'ALL',

  Length = 'LENGTH',
  Minimum = 'MINIMUM',
  Maximum = 'MAXIMUM',
  Sum = 'SUM',

  UnitSeconds = 'UNIT_SECONDS',
  UnitMinutes = 'UNIT_MINUTES',
  UnitHours = 'UNIT_HOURS',
  UnitDays = 'UNIT_DAYS',
  UnitWeeks = 'UNIT_WEEKS',
  UnitMonths = 'UNIT_MONTHS',
  UnitYears = 'UNIT_YEARS',
  TimeAgo = 'TIME_AGO',
  TimeAhead = 'TIME_AHEAD',
  TimeNow = 'TIME_NOW',
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
  [Token.Assign]: /^=/, // @todo := to declare too?
  [Token.Ornament]: /^:\b/,
  [Token.CurlyLeft]: /^\{/,
  [Token.CurlyRight]: /^\}/,
  [Token.ParenLeft]: /^\(/,
  [Token.ParenRight]: /^\)/,
  [Token.BraceLeft]: /^\[/,
  [Token.BraceRight]: /^\]/,
  [Token.Comma]: /^,/,
  [Token.Let]: /^let\b/,
  [Token.Identifier]: /^\$[a-zA-Z_\d]+/,
  [Token.NumberLiteral]: /^[\d]+[\d_]*(\.[\d_]*)?/,
  [Token.StringLiteral]: /^"(?:[^\\"]|\\(?:[bfnrtv"\\/]|u[0-9a-fA-F]{4}))*"/,
  [Token.BoolLiteral]: /^(true|false)/,

  [Token.Print]: /^print\b/,
  [Token.If]: /^if\b/,
  [Token.Else]: /^else\b/,
  [Token.Each]: /^(each|for)\b/,
  [Token.Of]: /^(of|in)\b/,
  [Token.Includes]: /^includes\b/,
  [Token.Matches]: /^matches\b/,
  [Token.Take]: /^(take|get|use)\b/,
  [Token.From]: /^from\b/,
  [Token.Or]: /^or\b/,
  [Token.And]: /^and\b/,
  [Token.Reject]: /^reject\b/,
  [Token.Validate]: /^validate\b/,
  [Token.Any]: /^any\b/,
  [Token.All]: /^all\b/,

  [Token.UnitSeconds]: /^seconds?\b/,
  [Token.UnitMinutes]: /^minutes?\b/,
  [Token.UnitHours]: /^hours?\b/,
  [Token.UnitDays]: /^days?\b/,
  [Token.UnitWeeks]: /^weeks?\b/,
  [Token.UnitMonths]: /^months?\b/,
  [Token.UnitYears]: /^years?\b/,
  // [Token.UnitSeconds]: /^s(?:ec(?:ond)?s?)?\b/,
  // [Token.UnitMinutes]: /^m(?:in(?:ute)?s?)?\b/,
  // [Token.UnitHours]: /^h(?:(r|our)s?)?\b/,
  // [Token.UnitDays]: /^d(?:ays?)?\b/,
  // [Token.UnitWeeks]: /^w(?:ee)?(?:k)?s?\b/,
  // [Token.UnitMonths]: /^mo(?:nth?)?s?\b/,
  // [Token.UnitYears]: /^y(?:(r|ear)s?)?\b/,

  [Token.Length]: /^length\b/,
  [Token.Minimum]: /^min(imum)?\b/,
  [Token.Maximum]: /^max(imum)?\b/,
  [Token.Sum]: /^sum\b/,

  [Token.TimeAgo]: /^ago\b/,
  [Token.TimeAhead]: /^(ahead|later|from\snow)\b/,
  [Token.TimeNow]: /^(now|today)\b/,
}
