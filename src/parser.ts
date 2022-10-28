import { IToken } from './scanner'
import { Token } from './tokens'

class Parser {
  private cursor: number = 0

  constructor (private tokens: IToken[]) {}

  static from (tokens: IToken[]) {
    return new Parser(tokens.slice())
  }

  public parse () {
    return this.parseExpression()
  }


  private parseExpression (): IASTNode {
    return this.parseEquality()
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
}

type IASTNodeLiteral = {
  type: NodeType.Literal
  value: string | number | boolean
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
type IASTNode = IASTNodeLiteral | IASTNodeUnary | IASTNodeBinary | IASTNodeGrouping

export const interpretAst = (node: IASTNode) => resolveAstNode(node)
export const resolveAstNode = (node: IASTNode): any => {
  switch (node.type) {
    case NodeType.Literal: return node.value
    case NodeType.UnaryExpr: {
      const op = node.value[0]
      const ex = resolveAstNode(node.value[1])
      if (op.type === Token.Not) {
        return !ex
      } else if (op.type === Token.Minus) {
        return ex * -1
      }
      throw new Error(`Unknown unary operator: "${op.lexeme}"`)
    }
    case NodeType.BinaryExpr: {
      const op = node.value[1]
      const left = resolveAstNode(node.value[0])
      const right = resolveAstNode(node.value[2])
      switch (op.type) {
        case Token.Plus: return left + right
        case Token.Minus: return left - right
        case Token.Multiply: return left * right
        case Token.Divide: return left / right
        case Token.Greater: return left > right
        case Token.GreaterEqual: return left >= right
        case Token.Less: return left < right
        case Token.LessEqual: return left <= right
        case Token.Equals: return left == right
        case Token.NotEquals: return left != right
      }
      throw new Error(`Unknown binary operator: "${op.lexeme}"`)
    }
    case NodeType.Grouping: return resolveAstNode(node.value)
  }
}
