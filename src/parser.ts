import { IToken } from './scanner'
import { Token } from './tokens'

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
    }
  }

  private parseStatement (): IASTNode {
    if (this.match(Token.Let)) {
      return this.parseDeclareStatement()
    }
    if (this.match(Token.Print)) {
      return this.parsePrintStatement()
    }
    return this.parseExpressionStatement()
  }
  private parseDeclareStatement (): IASTNode {
    const name = this.consume(Token.Identifier, 'Expected identifier')
    this.consume(Token.Assign, 'Expected initializer')
    const value = this.parseExpression()
    this.consume(Token.EOL, 'Expected EOL')
    return {
      type: NodeType.DeclareStatement,
      value: [ name, value ],
    }
  }
  private parsePrintStatement (): IASTNode {
    const value = this.parseExpression()
    this.consume(Token.EOL, 'No EOL')
    return {
      type: NodeType.PrintStatement,
      value,
    }
  }
  private parseExpressionStatement (): IASTNode {
    const value = this.parseExpression()
    this.consume(Token.EOL, 'No EOL')
    return {
      type: NodeType.ExprStatement,
      value,
    }
  }


  private parseExpression (): IASTNode {
    return this.parseAssignment()
  }
  private parseAssignment (): IASTNode {
    const expr = this.parseEquality()
    if (this.match(Token.Assign)) {
      const value = this.parseAssignment()
      if (expr.type !== NodeType.Variable) {
        throw new Error('Invalid assignment')
      }
      return {
        type: NodeType.AssignStatement,
        value: [ expr.value, value ],
      }
    }
    return expr
  }
  private parseEquality (): IASTNode {
    let expr = this.parseComparison()

    while (this.match(Token.NotEquals, Token.Equals)) {
      const op = this.previous()
      const right = this.parseComparison()
      expr = {
        type: NodeType.BinaryExpr,
        value: [ expr, op, right ],
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
      }
    }
    return this.parsePrimary()
  }
  private parsePrimary (): IASTNode {
    if (this.match(Token.BoolLiteral)) {
      return {
        type: NodeType.Literal,
        value: this.previous().lexeme === 'true',
      }
    }
    if (this.match(Token.NumberLiteral)) {
      return {
        type: NodeType.Literal,
        value: parseFloat(this.previous().lexeme),
      }
    }
    if (this.match(Token.StringLiteral)) {
      const t = this.previous().lexeme
      return {
        type: NodeType.Literal,
        value: t.substring(1, t.length - 1),
      }
    }
    if (this.match(Token.Identifier)) {
      const value = this.previous().lexeme
      return {
        type: NodeType.Variable,
        value,
      }
    }

    if (this.match(Token.ParenLeft)) {
      const expr = this.parseExpression()
      this.consume(Token.ParenRight, 'Expected ")" after expression')
      return {
        type: NodeType.Grouping,
        value: expr,
      }
    }

    throw new Error('No idea what to do')
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
  BinaryExpr,
  UnaryExpr,
  Grouping,
  Variable,

  StatementList,
  ExprStatement,
  PrintStatement,
  DeclareStatement,
  AssignStatement,
}

type IASTNodeLiteral = {
  type: NodeType.Literal
  value: string | number | boolean
}
type IASTNodeVariable = {
  type: NodeType.Variable
  value: string
}
type IASTNodeUnary = {
  type: NodeType.UnaryExpr
  value: [ IToken, IASTNode ]
}
type IASTNodeBinary = {
  type: NodeType.BinaryExpr
  value: [ IASTNode, IToken, IASTNode ]
}
type IASTNodeGrouping = {
  type: NodeType.Grouping
  value: IASTNode
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
  value: [ string, IASTNode ]
}
type IASTNodeDeclareStatement = {
  type: NodeType.DeclareStatement
  value: [ IToken, IASTNode ]
}
export type IASTNode = IASTNodeLiteral | IASTNodeVariable | IASTNodeUnary | IASTNodeBinary | IASTNodeGrouping
  | IASTNodePrintStatement | IASTNodeExprStatement | IASTNodeStatementList | IASTNodeAssignStatement | IASTNodeDeclareStatement
