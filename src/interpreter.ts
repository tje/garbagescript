import { IASTNode, NodeType } from './parser.js'
import { Token } from './tokens.js'

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

class Money extends Number {
  constructor (private _value: number, private _locale = 'en-US', private _currency = 'USD') {
    super(_value)
  }

  public get rawValue () {
    return this._value
  }

  public get value () {
    return Math.round(this._value * 100) / 100
  }

  public toJSON () {
    return this.toString()
  }

  public valueOf () {
    return this.value
  }

  public toString () {
    const nf = new Intl.NumberFormat(this._locale, {
      style: 'currency',
      currency: this._currency,
    })
    return nf.format(this.value)
  }

  [Symbol.toPrimitive] (hint: string) {
    console.log({ hint })
    if (hint === 'string') {
      return this.toString()
    }
    return this.value
  }
}

export class RejectMessage extends Error {
  constructor (private _msg: string, private _start: number, private _end: number) {
    super(_msg)
  }

  public get reason () {
    return this._msg
  }

  public get range () {
    return [ this._start, this._end ]
  }
}

export class ValidationResults {
  constructor (private _errors: RejectMessage[], private _label?: string) {}

  public get passed () {
    return this._errors.length === 0
  }

  public get label () {
    return this._label
  }

  public get errors () {
    return this._errors.slice()
  }
}

export class EvaluationResults {
  constructor (private _output: any, private _validationResults: ValidationResults[], private _diagnostics: InterpreterDiagnostic[]) {}

  public get output () {
    return this._output
  }

  public get validationResults () {
    return this._validationResults.slice()
  }

  public get validationErrors () {
    return this._validationResults
      .map((vr) => vr.errors)
      .flat()
  }

  public get diagnostics () {
    return this._diagnostics.slice()
  }
}

class StopEarly extends Error {
  constructor () {
    super()
  }
}

export enum DiagnosticSeverity {
  Error = 'error',
  Warning = 'warning',
}

export class InterpreterDiagnostic extends Error {
  constructor (msg: string, private _node: IASTNode, private _severity = DiagnosticSeverity.Error) {
    super(msg)
  }

  get offset () {
    return this._node.start
  }

  get node () {
    return this._node
  }

  get severity () {
    return this._severity
  }
}

export const interpretAst = (...nodes: IASTNode[]) => {
  const interpreter = createInterpreter()
  return interpreter.run(...nodes)
}

export type IInterpreterOptions = {
  subjectData?: { [key: string]: any }
  ignoreErrors?: boolean
  stopAt?: number
}

export const createInterpreter = (options: IInterpreterOptions = {}) => {
  let cursor = 0

  let validateCounter = 0
  const rejects: RejectMessage[] = []
  const validationResults: ValidationResults[] = []
  const diagnostics: InterpreterDiagnostic[] = []

  const stack = createStack()
  if (options.subjectData) {
    for (const [ key, val ] of Object.entries(options.subjectData)) {
      stack.write(key, val, { mutable: false })
    }
  }

  const pitchDiagnostic = (msg: string, node: IASTNode, severity = DiagnosticSeverity.Error) => {
    const err = new InterpreterDiagnostic(msg, node, severity)
    diagnostics.push(err)
    if (severity === DiagnosticSeverity.Error && !options.ignoreErrors) {
      throw err
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
        if (val instanceof Date) {
          const v = val as Date
          switch (op.type) {
            case Token.UnitYears: return v.getFullYear()
            case Token.UnitMonths: return v.getMonth() + 1
            case Token.UnitDays: return v.getDate()
          }
        }
        switch (op.type) {
          case Token.Uppercase:
          case Token.Lowercase:
            if (typeof val !== 'string') {
              pitchDiagnostic(`Ornament "${op.lexeme}" must be applied to a string`, node)
              return undefined
            }
            return op.type === Token.Uppercase
              ? val.toUpperCase()
              : val.toLowerCase()
          case Token.Trim:
            if (typeof val !== 'string') {
              pitchDiagnostic(`Ornament "${op.lexeme}" must be applied to a string`, node)
              return undefined
            }
            return val.trim()
          case Token.Lines:
          case Token.Words:
          case Token.Characters:
            if (typeof val !== 'string') {
              pitchDiagnostic(`Ornament "${op.lexeme}" must be applied to a string`, node)
              return undefined
            }
            if (op.type === Token.Words) {
              return val.trim().split(/\s+/)
            }
            if (op.type === Token.Characters) {
              return val.split('')
            }
            return val.split('\n')
          case Token.Unique:
            if (!Array.isArray(val)) {
              pitchDiagnostic(`Ornament "${op.lexeme}" must be applied to an array`, node)
              return undefined
            }
            return val.filter((v, idx, a) => a.indexOf(v) === idx)
          case Token.Length:
            if (Array.isArray(val)) {
              return val.length
            }
            if (typeof val !== 'string') {
              pitchDiagnostic(`Ornament "${op.lexeme}" is intended to be used with strings and arrays, but was applied to something unexpected here (${typeof val})`, node, DiagnosticSeverity.Warning)
            }
            return String(val).length
          case Token.Reverse:
            if (Array.isArray(val)) {
              return val.slice().reverse()
            }
            if (typeof val !== 'string') {
              pitchDiagnostic(`Ornament "${op.lexeme}" is intended to be used with strings and arrays, but was applied to something unexpected here (${typeof val})`, node, DiagnosticSeverity.Warning)
            }
            return String(val).split('').reverse().join('')
          case Token.Minimum:
          case Token.Maximum:
          case Token.Sum:
            if (!Array.isArray(val)) {
              pitchDiagnostic(`Ornament "${op.lexeme}" must be applied to an array`, node)
              return undefined
            }
            if (val.length === 0) {
              pitchDiagnostic(`Ornament "${op.lexeme}" can not be applied to an empty array`, node)
              return undefined
            }
            if (val.some((n) => typeof n !== 'number')) {
              pitchDiagnostic(`Ornament "${op.lexeme}" can only be applied to arrays with numeric values`, node)
              return undefined
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
          case Token.Round:
          case Token.Ceil:
          case Token.Floor:
          case Token.Money:
            const v = parseFloat(val)
            if (typeof val !== 'number') {
              const sev = isNaN(v) ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning
              pitchDiagnostic(`Ornament "${op.lexeme}" is intended to be used with numbers, but was applied to something unexpected here (${typeof val})`, node, sev)
            }
            switch (op.type) {
              case Token.Round: return Math.round(v)
              case Token.Ceil: return Math.ceil(v)
              case Token.Floor: return Math.floor(v)
              case Token.Money: return new Money(v)
            }
        }
        pitchDiagnostic(`Unknown ornament: "${op.lexeme}"`, node)
        return val
      case NodeType.UnaryExpr: {
        const op = node.value[0]
        const ex = resolveAstNode(node.value[1])
        if (op.type === Token.Not) {
          return !ex
        } else if (op.type === Token.Minus) {
          return ex * -1
        }
        pitchDiagnostic(`Unknown unary operator: "${op.lexeme}"`, node)
        return ex
      }
      case NodeType.BinaryExpr: {
        const op = node.value[1]
        const a = resolveAstNode(node.value[0])
        const b = resolveAstNode(node.value[2])
        const wrap = (n: any) => {
          if (a instanceof Date || b instanceof Date) {
            return new Date(n)
          }
          if (a instanceof Money || b instanceof Money) {
            if (typeof a === 'number' || typeof b === 'number') {
              return new Money(n)
            }
          }
          return n
        }
        const unwrap = (n: any) => {
          if (a instanceof Money || b instanceof Money) {
            if (typeof a === 'string' || typeof b === 'string') {
              return n.toString()
            }
          }
          return n?.valueOf() ?? n
        }
        const left = unwrap(a)
        const right = unwrap(b)

        // Type mismatch
        switch (op.type) {
          case Token.Multiply:
          case Token.Divide:
          case Token.Greater:
          case Token.GreaterEqual:
          case Token.Less:
          case Token.LessEqual:
            if (isNaN(left)) {
              pitchDiagnostic(`Expected a number, got "${typeof left}" instead`, node.value[0], DiagnosticSeverity.Warning)
            }
            if (isNaN(right)) {
              pitchDiagnostic(`Expected a number, got "${typeof right}" instead`, node.value[2], DiagnosticSeverity.Warning)
            }
          break
          case Token.Includes:
            if (!Array.isArray(left)) {
              pitchDiagnostic(`Expected an array, got "${typeof left}" instead`, node.value[0], DiagnosticSeverity.Warning)
            }
          break
          case Token.Matches:
            if (typeof left !== 'string') {
              pitchDiagnostic(`Expected a string, got "${typeof left}" instead`, node.value[0], DiagnosticSeverity.Warning)
            }
            if (typeof right !== 'string') {
              pitchDiagnostic(`Expected a string, got "${typeof right}" instead`, node.value[2], DiagnosticSeverity.Warning)
            }
          break
          case Token.Of:
            if (!Array.isArray(right)) {
              pitchDiagnostic(`Expected an array, got "${typeof right}" instead`, node.value[2], DiagnosticSeverity.Warning)
            }
          break
        }

        switch (op.type) {
          case Token.Plus:
            if (Array.isArray(left)) {
              return [ ...left.slice(), ...[right].flat(1) ]
            }
            return wrap(left + right)
          case Token.Minus:
            if (Array.isArray(left)) {
              const other = [right].flat(1)
              return left.filter((e) => !other.includes(e))
            }
            return wrap(left - right)
          case Token.Multiply: return wrap(left * right)
          case Token.Divide: return wrap(left / right)
          case Token.Greater: return left > right
          case Token.GreaterEqual: return left >= right
          case Token.Less: return left < right
          case Token.LessEqual: return left <= right
          case Token.Equals: return left == right
          case Token.NotEquals: return left != right
          case Token.Includes: return left?.includes?.(right)
          case Token.Matches: return typeof left === 'string' && typeof right === 'string' && left.toLowerCase().includes(right.toLowerCase())
          case Token.Of: return Array.isArray(right) && right.includes(left)
          case Token.Modulo: return wrap(left % right)
        }
        pitchDiagnostic(`Unknown binary operator: "${op.lexeme}"`, node)
        return undefined
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
      case NodeType.Variable:
        const value = stack.read(node.value)
        if (value === undefined) {
          pitchDiagnostic(`Undefined variable: ${node.value}`, node)
        }
        return value
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
        try {
          stack.write(key, value)
        } catch (err: any) {
          pitchDiagnostic(err.toString(), node)
        }
        return value
      }
      case NodeType.AssignStatement: {
        const key = node.value[0]
        let value = resolveAstNode(node.value[1])
        const { type } = node.value[2]
        const prev = stack.read(key)
        switch (type) {
          case Token.PlusEquals:
            if (Array.isArray(prev)) {
              value = prev.slice().concat(...[value].flat(1))
              break
            }
            value = prev + value
          break
          case Token.MinusEquals:
            if (Array.isArray(prev)) {
              const other = [value].flat(1)
              value = prev.filter((e) => !other.includes(e))
              break
            }
            value = prev - value
          break
          case Token.MultiplyEquals: value = prev * value ; break
          case Token.DivideEquals: value = prev / value ; break
        }
        if (typeof prev !== typeof value) {
          pitchDiagnostic(`Variable type changed from "${typeof prev}" to "${typeof value}"`, node, DiagnosticSeverity.Warning)
        }
        try {
          stack.write(key, value, { mode: 'update' })
        } catch (err: any) {
          pitchDiagnostic(err.toString(), node)
        }
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
        if (!Array.isArray(items)) {
          pitchDiagnostic('Not iterable', node.value[0])
          return []
        }
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
        validateCounter += 1
        let label = null
        if (node.value[1]) {
          label = resolveAstNode(node.value[1])
        }
        for (const statement of node.value[0]) {
          try {
            resolveAstNode(statement)
          } catch (err) {
            if (!options.ignoreErrors) {
              throw err
            }
          }
        }
        validateCounter -= 1
        const vr = new ValidationResults(rejects.splice(0, rejects.length), label)
        validationResults.push(vr)
        return vr
      }
      case NodeType.RejectStatement: {
        const value = resolveAstNode(node.value)
        if (value) {
          const err = new RejectMessage(value, node.start, node.value.end)
          rejects.push(err)
          if (validateCounter === 0) {
            throw err
          }
        }
        return
      }
    }
  }

  const run = (...nodes: IASTNode[]) => {
    cursor = 0
    stack.flush()
    let output = null
    loop: for (const node of nodes) {
      try {
        output = resolveAstNode(node)
      } catch (e) {
        if (e instanceof StopEarly) {
          break loop
        }
        throw e
      }
    }
    return new EvaluationResults(
      output?.valueOf?.() ?? output,
      validationResults.splice(0, validationResults.length),
      diagnostics,
    )
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
      const copy = JSON.parse(JSON.stringify(item.value))
      if (item.value instanceof Date) {
        return new Date(copy)
      }
      return copy
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
