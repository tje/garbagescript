import { IASTNode, NodeType } from './parser'
import { Token } from './tokens'

enum DurationUnit {
  Second,
  Minute,
  Hour,
  Day,
  Week,
  Month,
  Year,
}
class Duration extends Number {
  constructor (private value: number, private unit: DurationUnit) {
    super(value)
  }

  private get _unitValue () {
    switch (this.unit) {
      case DurationUnit.Second: return 1_000
      case DurationUnit.Minute: return 60 * 1_000
      case DurationUnit.Hour: return 60 * 60 * 1_000
      case DurationUnit.Day: return 24 * 60 * 60 * 1_000
      case DurationUnit.Week: return 7 * 24 * 60 * 60 * 1_000
      case DurationUnit.Month: return 30 * 24 * 60 * 60 * 1_000
      case DurationUnit.Year: return 365 * 24 * 60 * 60 * 1_000
    }
  }

  private get _product () {
    return this.value * this._unitValue
  }

  public toJSON () {
    return this._product
  }

  public valueOf () {
    return this._product
  }

  [Symbol.toPrimitive] (_hint: string) {
    return this._product
  }
}

class RejectMessage extends Error {
  constructor (private _msg: string) {
    super(_msg)
  }

  public get reason () {
    return this._msg
  }
}

class StopEarly extends Error {
  constructor () {
    super()
  }
}

export const interpretAst = (...nodes: IASTNode[]) => {
  const interpreter = createInterpreter()
  return interpreter.run(...nodes)
}

type IInterpreterOptions = {
  subjectData?: { [key: string]: any }
  ignoreErrors?: boolean
  stopAt?: number
}

export const createInterpreter = (options: IInterpreterOptions = {}) => {
  let cursor = 0

  const stack = createStack()
  if (options.subjectData) {
    for (const [ key, val ] of Object.entries(options.subjectData)) {
      stack.write(key, val, { mutable: false })
    }
  }

  const resolveAstNode = (node: IASTNode): any => {
    cursor = node.start
    if (options.stopAt !== undefined && options.stopAt <= cursor) {
      throw new StopEarly()
    }
    switch (node.type) {
      case NodeType.Literal: return node.value
      case NodeType.Measurement:
        const n = resolveAstNode(node.value[0])
        switch (node.value[1].type) {
          // case Token.UnitSeconds: return n * 1_000
          // case Token.UnitMinutes: return n * 60 * 1_000
          // case Token.UnitHours: return n * 60 * 60 * 1_000
          // case Token.UnitDays: return n * 24 * 60 * 60 * 1_000
          // case Token.UnitWeeks: return n * 7 * 24 * 60 * 60 * 1_000
          case Token.UnitSeconds: return new Duration(n, DurationUnit.Second)//return n * 1_000
          case Token.UnitMinutes: return new Duration(n, DurationUnit.Minute)//return n * 60 * 1_000
          case Token.UnitHours: return new Duration(n, DurationUnit.Hour)//return n * 60 * 60 * 1_000
          case Token.UnitDays: return new Duration(n, DurationUnit.Day)//return n * 24 * 60 * 60 * 1_000
          case Token.UnitWeeks: return new Duration(n, DurationUnit.Week)//return n * 7 * 24 * 60 * 60 * 1_000
          // Shaky time
          // case Token.UnitMonths: return n * 30 * 24 * 60 * 60 * 1_000
          // case Token.UnitYears: return n * 365 * 24 * 60 * 60 * 1_000
          case Token.UnitMonths: return new Duration(n, DurationUnit.Month)
          case Token.UnitYears: return new Duration(n, DurationUnit.Year)
        }
        return n
      case NodeType.Date: return new Date()
      case NodeType.RelativeDate: {
        const dur = resolveAstNode(node.value[0])
        let ts = Date.now()
        if (node.value[1].type === Token.TimeAgo) {
          ts -= dur.valueOf()
        } else {
          ts += dur.valueOf()
        }
        return new Date(ts)
      }
      case NodeType.OrnamentExpr:
        const op = node.value[1]
        const val = resolveAstNode(node.value[0])
        switch (op.type) {
          case Token.Length:
            return Array.isArray(val)
              ? val.length
              : String(val).length
          case Token.Minimum:
          case Token.Maximum:
          case Token.Sum:
            if (!Array.isArray(val)) {
              throw new Error(`Ornament "${op.lexeme}" must be applied to an array`)
            }
            if (val.length === 0) {
              throw new Error(`Ornament "${op.lexeme}" can not be applied to an empty array`)
            }
            if (val.some((n) => typeof n !== 'number')) {
              throw new Error(`Ornament "${op.lexeme}" can only be applied to arrays with numeric values`)
            }
            if (op.type === Token.Minimum) {
              return Math.min(...val)
            }
            if (op.type === Token.Maximum) {
              return Math.max(...val)
            }
            if (op.type === Token.Sum) {
              return val.reduce((acc, n) => acc + n, 0)
            }
        }
        throw new Error(`Unknown ornament: "${op.lexeme}"`)
      case NodeType.UnaryExpr: {
        const op = node.value[0]
        const ex = resolveAstNode(node.value[1])
        if (op.type === Token.Not) {
          return !ex
        } else if (op.type === Token.Minus) {
          return ex * -1
        }
        if (options.ignoreErrors) {
          return
        }
        throw new Error(`Unknown unary operator: "${op.lexeme}"`)
      }
      case NodeType.BinaryExpr: {
        const op = node.value[1]
        const left = resolveAstNode(node.value[0])?.valueOf()
        const right = resolveAstNode(node.value[2])?.valueOf()
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
          case Token.Includes: return left?.includes?.(right)
          case Token.Matches: return typeof left === 'string' && typeof right === 'string' && left.toLowerCase().includes(right.toLowerCase())
          case Token.Of: return Array.isArray(right) && right.includes(left)
        }
        if (options.ignoreErrors) {
          return
        }
        throw new Error(`Unknown binary operator: "${op.lexeme}"`)
      }
      case NodeType.LogicalExpr: {
        const op = node.value[1]
        const left = resolveAstNode(node.value[0])
        if (op.type === Token.Or && left) {
          return left
        }
        if (op.type === Token.And && !left) {
          return left
        }
        return resolveAstNode(node.value[2])
      }
      case NodeType.Variable: return stack.read(node.value)
      case NodeType.BlockExpr: {
        stack.push()
        const out = resolveAstNode(node.value as IASTNode)
        stack.pop()
        return out
      }
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
        let value = resolveAstNode(node.value[1])
        const { type } = node.value[2]
        const prev = stack.read(key)
        switch (type) {
          case Token.PlusEquals: value = prev + value ; break
          case Token.MinusEquals: value = prev - value ; break
          case Token.MultiplyEquals: value = prev * value ; break
          case Token.DivideEquals: value = prev / value ; break
        }
        stack.write(key, value, { mode: 'update' })
        return value
      }
      case NodeType.IfStatement: {
        const cond = resolveAstNode(node.value[0])
        if (cond) {
          return resolveAstNode(node.value[1])
        } else if (node.value[2]) {
          return resolveAstNode(node.value[2])
        }
        return
      }
      case NodeType.IterStatement: {
        const items = resolveAstNode(node.value[0])
        const out = []
        for (const item of items) {
          stack.push()
          stack.write('__scope', item)
          if (node.value[2]) {
            stack.write(node.value[2].lexeme, item)
          }
          out.push(resolveAstNode(node.value[1]))
          stack.pop()
        }
        return out
      }
      case NodeType.Collection: return node.value.map((n) => resolveAstNode(n))
      case NodeType.TakeStatement: {
        node.value.map((n) => resolveAstNode(n))
        return
      }
      case NodeType.ValidateStatement: {
        const errors = []
        let label = null
        if (node.value[1]) {
          label = resolveAstNode(node.value[1])
        }
        for (const statement of node.value[0]) {
          try {
            resolveAstNode(statement)
          } catch (err) {
            if (err instanceof RejectMessage) {
              errors.push(err.reason)
            } else if (!options.ignoreErrors) {
              throw err
            }
          }
        }
        return {
          passed: errors.length === 0,
          label,
          errors,
        }
      }
      case NodeType.RejectStatement: {
        const value = resolveAstNode(node.value)
        if (value) {
          throw new RejectMessage(value)
        }
        return
      }
    }
  }

  const run = (...nodes: IASTNode[]) => {
    cursor = 0
    stack.flush()
    let output = null
    for (const node of nodes) {
      try {
        output = resolveAstNode(node)
      } catch (e) {
        if (e instanceof StopEarly) {
          return output
        }
        throw e
      }
    }
    return output?.valueOf?.() ?? output
  }

  const getScope = () => stack.dump()

  return {
    run,
    getScope,
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
export const createStack = () => {
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
    const parts = key.split('.')
    let item = _findInStack(parts.shift()!)
    while (item && parts.length > 0) {
      const next = parts.shift()!
      if (item.value?.[next] === undefined) {
        return undefined
      }
      item = {
        ...item,
        value: item.value[next],
      }
    }
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

  const flush = () => {
    stack.splice(1, stack.length - 1)
  }

  push()

  return {
    read,
    write,
    push,
    pop,
    flush,

    dump () {
      return stack.slice()
    },
  }
}
