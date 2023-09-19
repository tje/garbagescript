import { IToken } from './scanner.js'
import { Token } from './tokens.js'

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
      const context = this.consume(Token.Identifier, 'Expected context identifier')
      for (const value of values) {
        const varNode = ((value as IASTNodeDeclareStatement).value[1] as IASTNodeVariable)
        varNode.value = varNode.value.replace(/^__scope\./, `${context.lexeme}.`)
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
      end: this.peek().offset,
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
      end: this.peek().offset,
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
        throw new Error('Invalid assignment')
      }
      return {
        type: NodeType.AssignStatement,
        value: [ expr.value, value, token ],
        start: token.offset,
        end: this.peek().offset,
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
        end: this.peek().offset,
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
        end: this.peek().offset,
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
        end: this.peek().offset,
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
        end: this.peek().offset,
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
        end: this.peek().offset,
      }
    }

    return expr
  }
  private parseFactor (): IASTNode {
    let expr = this.parseUnary()

    while (this.match(Token.Divide, Token.Multiply)) {
      const op = this.previous()
      const right = this.parseUnary()
      expr = {
        type: NodeType.BinaryExpr,
        value: [ expr, op, right ],
        start: op.offset, // or expr?
        end: this.peek().offset,
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
        end: this.peek().offset,
      }
    }
    return this.parseOrnament()
  }
  private parseOrnament (): IASTNode {
    let expr = this.parsePrimary()
    while (this.match(Token.Ornament)) {
      const start = this.previous().offset
      if (!this.match(Token.Length, Token.Minimum, Token.Maximum, Token.Sum, Token.UnitYears, Token.UnitMonths, Token.UnitDays)) {
        throw new Error('Invalid ornament')
      }
      const op = this.previous()
      return {
        type: NodeType.OrnamentExpr,
        value: [ expr, op ],
        start,
        end: this.peek().offset,
      }
    }
    return expr
  }
  private parsePrimary (): IASTNode {
    const start = this.peek().offset

    if (this.match(Token.BoolLiteral)) {
      return {
        type: NodeType.Literal,
        value: this.previous().lexeme === 'true',
        start,
        end: this.peek().offset,
      }
    }
    if (this.match(Token.TimeNow)) {
      return {
        type: NodeType.Date,
        value: new Date(),
        start,
        end: this.peek().offset,
      }
    }
    if (this.match(Token.NumberLiteral)) {
      const digit: IASTNode = {
        type: NodeType.Literal,
        value: parseFloat(this.previous().lexeme),
        start,
        end: this.peek().offset,
      }
      if (this.match(Token.UnitSeconds, Token.UnitMinutes, Token.UnitHours, Token.UnitDays, Token.UnitWeeks, Token.UnitMonths, Token.UnitYears)) {
        const unit = this.previous()
        const measurement: IASTNode = {
          type: NodeType.Measurement,
          value: [ digit, unit ],
          start,
          end: this.peek().offset,
        }
        if (this.match(Token.TimeAgo, Token.TimeAhead)) {
          return {
            type: NodeType.RelativeDate,
            value: [ measurement, this.previous() ],
            start,
            end: this.peek().offset,
          }
        }
        return measurement
      }
      return digit
    }
    if (this.match(Token.StringLiteral)) {
      const t = this.previous().lexeme
      return {
        type: NodeType.Literal,
        value: t.substring(1, t.length - 1),
        start,
        end: this.peek().offset,
      }
    }
    if (this.match(Token.Identifier)) {
      const value = this.previous().lexeme
      return {
        type: NodeType.Variable,
        value,
        start,
        end: this.peek().offset,
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
        end: this.previous().offset,
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
    throw new Error('Bad syntax')
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
    throw new Error(message)
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
  AssignStatement,
  IfStatement,
  IterStatement,
  TakeStatement,
  RejectStatement,
  ValidateStatement,
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
  | IASTNodeIfStatement
  | IASTNodeIterStatement
  | IASTNodeTakeStatement
  | IASTNodeRejectStatement
  | IASTNodeValidateStatement
) & {
  start: number
  end: number
}
