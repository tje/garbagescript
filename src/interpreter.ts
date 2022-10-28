import { IASTNode, NodeType } from './parser'
import { Token } from './tokens'

export const interpretAst = (...nodes: IASTNode[]) => {
  const interpreter = createInterpreter()
  return interpreter.run(...nodes)
}

export const createInterpreter = () => {
  const stack = createStack()

  const resolveAstNode = (node: IASTNode): any => {
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
      case NodeType.Variable: return stack.read(node.value)
      case NodeType.Grouping: return resolveAstNode(node.value)
      case NodeType.PrintStatement: return console.log(resolveAstNode(node.value))
      case NodeType.ExprStatement: return resolveAstNode(node.value)
      case NodeType.StatementList: return node.value.reduce((_, n) => resolveAstNode(n), null)
      case NodeType.DeclareStatement: {
        const key = node.value[0].lexeme
        const value = resolveAstNode(node.value[1])
        stack.write(key, value)
        return value
      }
      case NodeType.AssignStatement: {
        const key = node.value[0]
        const value = resolveAstNode(node.value[1])
        stack.write(key, value, { mode: 'update' })
        return value
      }
    }
  }

  const run = (...nodes: IASTNode[]) => {
    let output = null
    for (const node of nodes) {
      output = resolveAstNode(node)
    }
    return output
  }

  return {
    run,
  }
}

type IStackFrame = Map<string, IStackElement>
type IStackElement = {
  mutable: boolean
  value: any
}
type IStackWriteConfig = {
  environment?: 'local' | 'global' | 'enclosure'
  mode?: 'upsert' | 'update' | 'insert'
  mutable?: boolean
}
const createStack = () => {
  const stack: IStackFrame[] = []

  const _findInStack = (key: string) => {
    const frame = _findContainingFrame(key)
    if (frame) {
      return frame.get(key)
    }
    return undefined
  }
  const _findContainingFrame = (key: string) => {
    const frames = stack.slice().reverse()
    for (const frame of frames) {
      if (frame.has(key)) {
        return frame
      }
    }
    return null
  }

  const push = () => {
    stack.push(new Map())
  }

  const pop = () => {
    stack.pop()
  }

  const read = (key: string) => {
    const item = _findInStack(key)
    if (item?.mutable === false) {
      return JSON.parse(JSON.stringify(item.value))
    }
    return item?.value
  }
  const write = (key: string, value: any, config: IStackWriteConfig = {}) => {
    const mode = config.mode ?? 'insert'
    let environment = config.environment
    if (environment === undefined) {
      if (mode === 'update') {
        environment = 'enclosure'
      } else {
        environment = 'local'
      }
    }
    const mutable = config.mutable ?? true

    let frame = stack[stack.length - 1]
    if (environment === 'enclosure') {
      frame = _findContainingFrame(key) ?? frame
    } else if (environment === 'global') {
      frame = stack[0]
    }

    if (frame.has(key)) {
      if (mode === 'insert') {
        throw new Error(`Can not insert "${key}", variable already exists`)
      }
      const item = frame.get(key)!
      if (!item.mutable) {
        throw new Error(`Immutable: "${key}"`)
      }
      item.value = value
      if (config.mutable !== undefined) {
        item.mutable = mutable
      }
      return item.value
    } else if (mode === 'update') {
      throw new Error(`Can not update "${key}", variable doesn't exist`)
    }

    frame.set(key, {
      value,
      mutable,
    })
    return value
  }

  push()

  return {
    read,
    write,
    push,
    pop,
  }
}
