import { IToken } from './scanner.js'
import { Token } from './tokens.js'

export class ParseError extends Error {
  constructor (msg: string, private _token: number | IToken) {
    super(msg)
  }

  get offset () {
    if (typeof this._token === 'number') {
      return this._token
    }
    return this._token.offset
  }

  get token () {
    if (typeof this._token === 'number') {
      return undefined
    }
    return this._token
  }
}

class Parser {
  private cursor: number = 0

  constructor (private tokens: IToken[]) {}

  static from (tokens: IToken[]) {
    return new Parser(tokens.slice())
  }

  public parse () {
    return this.parseProgram()
  }

  private parseProgram (): IASTNode {
    const statements: IASTNode[] = []

    while (!this.isAtEnd()) {
      statements.push(this.parseStatement())
    }
    return {
      type: NodeType.StatementList,
      value: statements,
      start: 0,
      end: this.previous().offset,
    }
  }

  private parseStatement (): IASTNode {
    if (this.match(Token.Take)) {
      return this.parseTakeStatement()
    }
    if (this.match(Token.Reject)) {
      return this.parseRejectStatement()
    }
    if (this.match(Token.Validate)) {
      return this.parseValidateStatement()
    }
    if (this.match(Token.Each)) {
      return this.parseIterStatement()
    }
    if (this.match(Token.If)) {
      return this.parseIfStatement()
    }
    if (this.match(Token.Let)) {
      return this.parseDeclareStatement()
    }
    if (this.match(Token.Define)) {
      return this.parseDefineStatement()
    }
    if (this.match(Token.Print)) {
      return this.parsePrintStatement()
    }
    return this.parseExpressionStatement()
  }
  private parseTakeStatement (): IASTNode {
    const start = this.previous().offset
    const values: IASTNode[] = []
    if (this.match(Token.CurlyLeft)) {
      while (!this.match(Token.CurlyRight)) {
        const token = this.consume(Token.Identifier, 'Expected identifier')
        values.push({
          type: NodeType.DeclareStatement,
          value: [
            token,
            {
              type: NodeType.Variable,
              value: '__scope.' + token.lexeme,
              start: token.offset,
              end: this.peek().offset,
            },
          ],
          start: this.previous().offset,
          end: this.peek().offset,
        })
        this.match(Token.Comma)
      }
    } else {
      const token = this.consume(Token.Identifier, 'Expected identifier')
      values.push({
        type: NodeType.DeclareStatement,
        value: [
          token,
          {
            type: NodeType.Variable,
            value: '__scope.' + token.lexeme,
            start: token.offset,
            end: this.peek().offset,
          }
        ],
        start: token.offset,
        end: this.peek().offset,
      })
    }
    if (this.match(Token.From)) {
      let context = this.consume(Token.Identifier, 'Expected context identifier').lexeme
      while (this.match(Token.Dot)) {
        context += '.' + this.consume(Token.Identifier, 'Expected property identifier').lexeme
      }
      for (const value of values) {
        const varNode = ((value as IASTNodeDeclareStatement).value[1] as IASTNodeVariable)
        varNode.value = varNode.value.replace(/^__scope\./, `${context}.`)
      }
    }
    return {
      type: NodeType.TakeStatement,
      value: values,
      start,
      end: this.peek().offset,
    }
  }
  private parseValidateStatement (): IASTNode {
    const start = this.previous().offset
    let note = null
    if (this.check(Token.StringLiteral)) {
      note = this.parsePrimary()
    }
    this.consume(Token.CurlyLeft, 'Expected opening block')
    const statements: IASTNode[] = []
    while (!this.match(Token.CurlyRight)) {
      statements.push(this.parseStatement())
    }
    return {
      type: NodeType.ValidateStatement,
      value: [
        statements,
        note,
      ],
      start,
      end: this.peek().offset,
    }
  }
  private parseRejectStatement (): IASTNode {
    const start = this.previous().offset
    const expr = this.parseExpression()
    return {
      type: NodeType.RejectStatement,
      value: expr,
      start,
      end: this.peek().offset,
    }
  }
  private parseIterStatement (): IASTNode {
    const start = this.previous().offset
    let scope = null
    if (this.peekNext().type === Token.Of && this.match(Token.Identifier)) {
      scope = this.previous()
      this.consume(Token.Of, 'Expected "of"')
    }
    const target = this.parseExpression()
    const expr = this.parseStatement()
    return {
      type: NodeType.IterStatement,
      value: [target, expr, scope],
      start,
      end: this.peek().offset,
    }
  }
  private parseIfStatement (): IASTNode {
    const start = this.previous().offset
    // @todo Fix then/else being expression/statement respectively
    const expr = this.parseExpression()
    const exprThen = this.parseExpression()
    let exprElse = null
    if (this.match(Token.Else)) {
      exprElse = this.parseStatement()
    }
    return {
      type: NodeType.IfStatement,
      value: [expr, exprThen, exprElse],
      start,
      end: exprElse?.end ?? exprThen.end,
    }
  }
  private parseDeclareStatement (): IASTNode {
    const start = this.previous().offset
    const name = this.consume(Token.Identifier, 'Expected identifier')
    this.consume(Token.Assign, 'Expected initializer')
    const value = this.parseStatement()
    return {
      type: NodeType.DeclareStatement,
      value: [ name, value ],
      start,
      end: value.end,
    }
  }
  private parseDefineStatement (): IASTNode {
    const start = this.previous().offset
    this.consume(Token.Ornament, 'Expected ornament')
    const name = this.consume(Token.CustomOrnamentIdentifier, 'Expected identifier')
    const body = this.parseExpressionStatement()
    return {
      type: NodeType.DefineStatement,
      value: [ name, body ],
      start,
      end: body.end,
    }
  }
  private parsePrintStatement (): IASTNode {
    const start = this.previous().offset
    const value = this.parseExpression()
    return {
      type: NodeType.PrintStatement,
      value,
      start,
      end: this.peek().offset,
    }
  }
  private parseExpressionStatement (): IASTNode {
    const start = this.peek().offset
    const value = this.parseExpression()
    return {
      type: NodeType.ExprStatement,
      value,
      start,
      end: value.end,
    }
  }


  private parseExpression (): IASTNode {
    return this.parseAssignment()
  }
  private parseAssignment (): IASTNode {
    const expr = this.parseOr()
    if (this.match(Token.Assign, Token.PlusEquals, Token.MinusEquals, Token.MultiplyEquals, Token.DivideEquals)) {
      const token = this.previous()
      const value = this.parseStatement()
      if (expr.type !== NodeType.Variable) {
        throw new ParseError('Invalid assignment', expr.start)
      }
      return {
        type: NodeType.AssignStatement,
        value: [ expr.value, value, token ],
        start: expr.start,
        end: value.end,
      }
    }
    return expr
  }
  private parseOr (): IASTNode {
    let expr = this.parseAnd()
    while (this.match(Token.Or)) {
      const op = this.previous()
      const right = this.parseEquality()
      expr = {
        type: NodeType.LogicalExpr,
        value: [ expr, op, right ],
        start: op.offset,
        end: right.end,
      }
    }
    return expr
  }
  private parseAnd (): IASTNode {
    let expr = this.parseEquality()

    while (this.match(Token.And)) {
      const op = this.previous()
      const right = this.parseEquality()
      expr = {
        type: NodeType.LogicalExpr,
        value: [ expr, op, right ],
        start: op.offset,
        end: right.end,
      }
    }

    return expr
  }
  private parseEquality (): IASTNode {
    let expr = this.parseComparison()

    while (this.match(Token.NotEquals, Token.Equals, Token.Includes, Token.Matches, Token.Of)) {
      const op = this.previous()
      const right = this.parseComparison()
      expr = {
        type: NodeType.BinaryExpr,
        value: [ expr, op, right ],
        start: op.offset,
        end: right.end,
      }
    }

    return expr
  }
  private parseComparison (): IASTNode {
    let expr = this.parseTerm()

    while (this.match(Token.Greater, Token.GreaterEqual, Token.Less, Token.LessEqual)) {
      const op = this.previous()
      const right = this.parseTerm()
      expr = {
        type: NodeType.BinaryExpr,
        value: [ expr, op, right ],
        start: op.offset,
        end: right.end,
      }
    }

    return expr
  }
  private parseTerm (): IASTNode {
    let expr = this.parseFactor()

    while (this.match(Token.Minus, Token.Plus)) {
      const op = this.previous()
      const right = this.parseFactor()
      expr = {
        type: NodeType.BinaryExpr,
        value: [ expr, op, right ],
        start: op.offset,
        end: right.end,
      }
    }

    return expr
  }
  private parseFactor (): IASTNode {
    let expr = this.parseUnary()

    while (this.match(Token.Divide, Token.Multiply, Token.Modulo)) {
      const op = this.previous()
      const right = this.parseUnary()
      expr = {
        type: NodeType.BinaryExpr,
        value: [ expr, op, right ],
        start: op.offset, // or expr?
        end: right.end,
      }
    }

    return expr
  }
  private parseUnary (): IASTNode {
    if (this.match(Token.Not, Token.Minus)) {
      const op = this.previous()
      const right = this.parseUnary()
      return {
        type: NodeType.UnaryExpr,
        value: [ op, right ],
        start: op.offset,
        end: right.end,
      }
    }
    return this.parseMeasurement()
  }
  private parseMeasurement (): IASTNode {
    let expr = this.parseOrnament()
    if (this.match(Token.UnitSeconds, Token.UnitMinutes, Token.UnitHours, Token.UnitDays, Token.UnitWeeks, Token.UnitMonths, Token.UnitYears)) {
      const unit = this.previous()
      const measurement: IASTNode = {
        type: NodeType.Measurement,
        value: [ expr, unit ],
        start: expr.start,
        end: unit.offset + unit.lexeme.length,
      }
      if (this.match(Token.TimeAgo, Token.TimeAhead)) {
        const op = this.previous()
        return {
          type: NodeType.RelativeDate,
          value: [ measurement, op ],
          start: expr.start,
          end: op.offset + op.lexeme.length,
        }
      }
      return measurement
    }
    return expr
  }
  private parseOrnament (): IASTNode {
    let expr = this.parseInspect()
    while (this.match(Token.Ornament)) {
      const start = this.previous().offset
      if (!this.match(
        Token.Length,
        Token.Minimum,
        Token.Maximum,
        Token.Sum,
        Token.UnitYears,
        Token.UnitMonths,
        Token.UnitDays,
        Token.Words,
        Token.Lines,
        Token.Characters,
        Token.Uppercase,
        Token.Lowercase,
        Token.Trim,
        Token.Unique,
        Token.Reverse,
        Token.Round,
        Token.Ceil,
        Token.Floor,
        Token.CustomOrnamentIdentifier,
      )) {
        throw new ParseError('Invalid ornament', this.peek())
      }
      const op = this.previous()
      expr = {
        type: NodeType.OrnamentExpr,
        value: [ expr, op ],
        start,
        end: op.offset + op.lexeme.length,
      }
    }
    while (this.match(Token.Inspect)) {
      const op = this.previous()
      expr = {
        type: NodeType.InspectExpr,
        value: expr,
        start: expr.start,
        end: op.offset + op.lexeme.length,
      }
    }
    return expr
  }
  private parseInspect (): IASTNode {
    let expr = this.parseIdentifier()
    while (this.match(Token.Inspect)) {
      const op = this.previous()
      expr = {
        type: NodeType.InspectExpr,
        value: expr,
        start: expr.start,
        end: op.offset + op.lexeme.length,
      }
    }
    return expr
  }
  private parseIdentifier (): IASTNode {
    if (this.match(Token.Identifier)) {
      const start = this.previous().offset
      let value = this.previous().lexeme
      while (this.match(Token.Dot)) {
        const property = this.consume(Token.Identifier, 'Expected identifier')
        value += '.' + property.lexeme
      }
      return {
        type: NodeType.Variable,
        value,
        start,
        end: start + value.length,
      }
    }
    return this.parsePrimary()
  }
  private parsePrimary (): IASTNode {
    const start = this.peek().offset

    if (this.match(Token.Index, Token.This)) {
      return {
        type: NodeType.MetaKeyword,
        value: this.previous(),
        start,
        end: start + this.previous().lexeme.length,
      }
    }
    if (this.match(Token.BoolLiteral)) {
      return {
        type: NodeType.Literal,
        value: this.previous().lexeme === 'true',
        start,
        end: start + this.previous().lexeme.length,
      }
    }
    if (this.match(Token.TimeNow)) {
      return {
        type: NodeType.Date,
        value: new Date(),
        start,
        end: start + this.previous().lexeme.length,
      }
    }
    if (this.match(Token.NumberLiteral)) {
      return {
        type: NodeType.Literal,
        value: parseFloat(this.previous().lexeme),
        start,
        end: start + this.previous().lexeme.length,
      }
    }
    if (this.match(Token.StringLiteral)) {
      const t = this.previous().lexeme
      return {
        type: NodeType.Literal,
        value: t.substring(1, t.length - 1),
        start,
        end: start + t.length,
      }
    }

    if (this.match(Token.CurlyLeft)) {
      const statements: IASTNode[] = []
      while (!this.match(Token.CurlyRight)) {
        statements.push(this.parseStatement())
      }
      return {
        type: NodeType.BlockExpr,
        value: {
          type: NodeType.StatementList,
          value: statements,
          // @todo fix tihs
          // @ts-ignore
          start,
          end: this.previous().offset,
        },
        start,
        end: this.previous().offset,
      }
    }
    if (this.match(Token.BraceLeft)) {
      const items: IASTNode[] = []
      while (!this.match(Token.BraceRight)) {
        items.push(this.parseExpression())
        this.match(Token.Comma)
      }
      return {
        type: NodeType.Collection,
        value: items,
        start,
        end: this.previous().offset + this.previous().lexeme.length,
      }
    }

    if (this.match(Token.ParenLeft)) {
      const expr = this.parseExpression()
      this.consume(Token.ParenRight, 'Expected ")" after expression')
      return {
        type: NodeType.Grouping,
        value: expr,
        start,
        end: this.previous().offset,
      }
    }

    // console.log(this.peek())
    throw new ParseError('Bad syntax', this.peek())
    // return {
    //   type: NodeType.Literal,
    //   value: -1,
    //   start,
    //   end: start,
    // }
  }


  // Traversal
  private consume (type: Token, message: string) {
    if (this.check(type)) {
      return this.advance()
    }
    throw new ParseError(message, this.peek())
  }

  private match (...types: Token[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance()
        return true
      }
    }
    return false
  }

  private advance (): IToken {
    if (!this.isAtEnd()) {
      this.cursor += 1
    }
    return this.previous()
  }
  private previous (): IToken {
    return this.tokens[this.cursor - 1]
  }

  private check (type: Token): boolean {
    if (this.isAtEnd()) {
      return false
    }
    return this.peek().type === type
  }

  private peek (): IToken {
    return this.tokens[this.cursor]
  }
  private peekNext (): IToken {
    return this.tokens[this.cursor + 1]
  }

  private isAtEnd (): boolean {
    return this.peek().type === Token.EOF
  }
}

export const generateAST = (tokens: IToken[]) => {
  const parser = Parser.from(tokens)
  return parser.parse()
}

export enum NodeType {
  Literal,
  Measurement,
  Date,
  RelativeDate,
  LogicalExpr,
  BinaryExpr,
  UnaryExpr,
  OrnamentExpr,
  Grouping,
  Variable,
  BlockExpr,
  Collection,

  StatementList,
  ExprStatement,
  PrintStatement,
  DeclareStatement,
  DefineStatement,
  AssignStatement,
  IfStatement,
  IterStatement,
  TakeStatement,
  RejectStatement,
  ValidateStatement,
  InspectExpr,
  MetaKeyword,
}

type IASTNodeLiteral = {
  type: NodeType.Literal
  value: string | number | boolean
}
type IASTNodeMeasurement = {
  type: NodeType.Measurement
  value: [ IASTNode, IToken ]
}
type IASTNodeDate = {
  type: NodeType.Date
  value: Date
}
type IASTNodeRelativeDate = {
  type: NodeType.RelativeDate
  value: [ IASTNode & IASTNodeMeasurement, IToken ]
}
type IASTNodeLogicalExpr = {
  type: NodeType.LogicalExpr
  value: [ IASTNode, IToken, IASTNode ]
}
type IASTNodeVariable = {
  type: NodeType.Variable
  value: string
}
type IASTNodeCollection = {
  type: NodeType.Collection
  value: IASTNode[]
}
type IASTNodeUnary = {
  type: NodeType.UnaryExpr
  value: [ IToken, IASTNode ]
}
type IASTNodeOrnament = {
  type: NodeType.OrnamentExpr
  value: [ IASTNode, IToken ]
}
type IASTNodeBinary = {
  type: NodeType.BinaryExpr
  value: [ IASTNode, IToken, IASTNode ]
}
type IASTNodeGrouping = {
  type: NodeType.Grouping
  value: IASTNode
}
type IASTNodeBlockExpression = {
  type: NodeType.BlockExpr
  value: IASTNodeStatementList
}
type IASTNodePrintStatement = {
  type: NodeType.PrintStatement
  value: IASTNode
}
type IASTNodeExprStatement = {
  type: NodeType.ExprStatement
  value: IASTNode
}
type IASTNodeStatementList = {
  type: NodeType.StatementList
  value: IASTNode[]
}
type IASTNodeAssignStatement = {
  type: NodeType.AssignStatement
  value: [ string, IASTNode, IToken ]
}
type IASTNodeDeclareStatement = {
  type: NodeType.DeclareStatement
  value: [ IToken, IASTNode ]
}
type IASTNodeDefineStatement = {
  type: NodeType.DefineStatement
  value: [ IToken, IASTNode ]
}
type IASTNodeIfStatement = {
  type: NodeType.IfStatement
  value: [ IASTNode, IASTNode, IASTNode | null ]
}
type IASTNodeIterStatement = {
  type: NodeType.IterStatement
  value: [ IASTNode, IASTNode, IToken | null ]
}
type IASTNodeTakeStatement = {
  type: NodeType.TakeStatement
  value: IASTNode[]
}
type IASTNodeRejectStatement = {
  type: NodeType.RejectStatement
  value: IASTNode
}
type IASTNodeValidateStatement = {
  type: NodeType.ValidateStatement
  value: [ IASTNode[], IASTNode | null ]
}
type IASTNodeInspectExpression = {
  type: NodeType.InspectExpr
  value: IASTNode
}
type IASTNodeMetaKeyword = {
  type: NodeType.MetaKeyword
  value: IToken
}
export type IASTNode = (
    IASTNodeLiteral
  | IASTNodeMeasurement
  | IASTNodeDate
  | IASTNodeRelativeDate
  | IASTNodeLogicalExpr
  | IASTNodeVariable
  | IASTNodeUnary
  | IASTNodeOrnament
  | IASTNodeBinary
  | IASTNodeGrouping
  | IASTNodeBlockExpression
  | IASTNodeCollection
  | IASTNodePrintStatement
  | IASTNodeExprStatement
  | IASTNodeStatementList
  | IASTNodeAssignStatement
  | IASTNodeDeclareStatement
  | IASTNodeDefineStatement
  | IASTNodeIfStatement
  | IASTNodeIterStatement
  | IASTNodeTakeStatement
  | IASTNodeRejectStatement
  | IASTNodeValidateStatement
  | IASTNodeInspectExpression
  | IASTNodeMetaKeyword
) & {
  start: number
  end: number
}
