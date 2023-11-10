import { IASTNode, NodeType } from './parser.js'
import { Token } from './tokens.js'
import { DurationUnit, GasArray, GasBoolean, GasDate, GasDuration, GasNumber, GasString, GasStruct, GasUnknown, GasValue } from './value/value.js'

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

export interface TraceEntry {
  node: IASTNode
  value: GasValue
}

export class EvaluationResults {
  constructor (private _output: any, private _validationResults: ValidationResults[], private _diagnostics: InterpreterDiagnostic[], private _trace: TraceEntry[]) {}

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

  public get trace () {
    return this._trace.slice()
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

type OrnamentFn = (input: any) => any
export type IInterpreterOptions = {
  subjectData?: { [key: string]: any }
  ignoreErrors?: boolean
  analyze?: boolean
  stopAt?: number
  ornamentExtensions?: Record<string, OrnamentFn>
}

export const createInterpreter = (options: IInterpreterOptions = {}) => {
  let cursor = 0

  let validateCounter = 0
  const rejects: RejectMessage[] = []
  const validationResults: ValidationResults[] = []
  const diagnostics: InterpreterDiagnostic[] = []
  const trace: Array<{ node: IASTNode, value: any }> = []

  const stack = createStack()
  if (options.subjectData) {
    for (const [ key, val ] of Object.entries(options.subjectData)) {
      stack.write(key, GasValue.from(val, [ key ]), { mutable: false })
    }
  }

  const pitchDiagnostic = (msg: string, node: IASTNode, severity = DiagnosticSeverity.Error) => {
    // console.log(msg)
    const err = new InterpreterDiagnostic(msg, node, severity)
    diagnostics.push(err)
    if (severity === DiagnosticSeverity.Error && !options.ignoreErrors) {
      throw err
    }
  }

  const resolveAstNode = (node: IASTNode, analyzeOnly = false): GasValue => {
    cursor = node.start
    if (options.stopAt !== undefined && options.stopAt <= cursor) {
      throw new StopEarly()
    }
    const tp = {
      node,
      value: new GasUnknown(undefined),
    }
    if (options.analyze) {
      trace.push(tp)
    }
    tp.value = _resolveAstNodeValue(node, analyzeOnly)
    return tp.value
  }

  const _resolveAstNodeValue = (node: IASTNode, analyzeOnly = false): GasValue => {
    switch (node.type) {
      case NodeType.Literal:
        switch (typeof node.value) {
          case 'string': return new GasString(node.value)
          case 'number': return new GasNumber(node.value)
          case 'boolean': return new GasBoolean(node.value)
        }
      case NodeType.Measurement:
        const v = resolveAstNode(node.value[0], analyzeOnly)
        if (!v.is(GasNumber)) {
          pitchDiagnostic(`Expected left-hand side to be a number, got ${v.type}`, node.value[0])
          return GasValue.from(v)
        }
        const n = v.inner
        switch (node.value[1].type) {
          // case Token.UnitSeconds: return n * 1_000
          // case Token.UnitMinutes: return n * 60 * 1_000
          // case Token.UnitHours: return n * 60 * 60 * 1_000
          // case Token.UnitDays: return n * 24 * 60 * 60 * 1_000
          // case Token.UnitWeeks: return n * 7 * 24 * 60 * 60 * 1_000
          case Token.UnitSeconds: return new GasDuration(n, DurationUnit.Second)//return n * 1_000
          case Token.UnitMinutes: return new GasDuration(n, DurationUnit.Minute)//return n * 60 * 1_000
          case Token.UnitHours: return new GasDuration(n, DurationUnit.Hour)//return n * 60 * 60 * 1_000
          case Token.UnitDays: return new GasDuration(n, DurationUnit.Day)//return n * 24 * 60 * 60 * 1_000
          case Token.UnitWeeks: return new GasDuration(n, DurationUnit.Week)//return n * 7 * 24 * 60 * 60 * 1_000
          // Shaky time
          // case Token.UnitMonths: return n * 30 * 24 * 60 * 60 * 1_000
          // case Token.UnitYears: return n * 365 * 24 * 60 * 60 * 1_000
          case Token.UnitMonths: return new GasDuration(n, DurationUnit.Month)
          case Token.UnitYears: return new GasDuration(n, DurationUnit.Year)
        }
        return v
      case NodeType.Date: return new GasDate(new Date())
      case NodeType.RelativeDate: {
        const dur = resolveAstNode(node.value[0], analyzeOnly)
        if (!dur.is(GasDuration)) {
          pitchDiagnostic(`Expected right-hand side to be a duration, got ${dur.type}`, node.value[0])
          return dur
        }
        let ts = Date.now()
        if (node.value[1].type === Token.TimeAgo) {
          ts -= dur.valueOf()
        } else {
          ts += dur.valueOf()
        }
        return new GasDate(new Date(ts))
      }
      case NodeType.OrnamentExpr:
        const op = node.value[1]
        const val = resolveAstNode(node.value[0])
        if (val.is(GasDate)) {
          const v = val.inner
          switch (op.type) {
            case Token.UnitYears: return new GasNumber(v.getFullYear())
            case Token.UnitMonths: return new GasNumber(v.getMonth() + 1)
            case Token.UnitDays: return new GasNumber(v.getDate())
          }
        }
        switch (op.type) {
          case Token.Uppercase:
          case Token.Lowercase:
            if (!val.is(GasString)) {
              pitchDiagnostic(`Ornament "${op.lexeme}" must be applied to a string`, node)
              return val
            }
            return new GasString(
              op.type === Token.Uppercase
                ? val.inner.toUpperCase()
                : val.inner.toLowerCase()
            )
          case Token.Trim:
            if (!val.is(GasString)) {
              pitchDiagnostic(`Ornament "${op.lexeme}" must be applied to a string`, node)
              return val
            }
            return new GasString(val.inner.trim())
          case Token.Lines:
          case Token.Words:
          case Token.Characters:
            if (!val.is(GasString)) {
              pitchDiagnostic(`Ornament "${op.lexeme}" must be applied to a string`, node)
              return val
            }
            if (op.type === Token.Words) {
              return new GasArray(val.inner.trim().split(/\s+/).map((e) => new GasString(e)))
            }
            if (op.type === Token.Characters) {
              return new GasArray(val.inner.split('').map((e) => new GasString(e)))
            }
            return new GasArray(val.inner.split('\n').map((e) => new GasString(e)))
          case Token.Unique: {
            if (!val.is(GasArray)) {
              pitchDiagnostic(`Ornament "${op.lexeme}" must be applied to an array`, node)
              return val
            }
            const items = (val.inner as GasValue<any>[])
              .filter((v, idx, a) => a.findIndex((o) => o.inner === v.inner) === idx)
            return new GasArray(items) as any
          }
          case Token.Length:
            if (val.is(GasArray)) {
              return new GasNumber(val.unwrap().length)
            }
            if (!val.is(GasString)) {
              pitchDiagnostic(`Ornament "${op.lexeme}" is intended to be used with strings and arrays, but was applied to something unexpected here (${val.type})`, node, DiagnosticSeverity.Warning)
            }
            return new GasNumber((val.inner as any)?.toString().length ?? 0)
          case Token.Reverse:
            if (val.is(GasArray)) {
              return new GasArray(val.inner.reverse())
            }
            if (!val.is(GasString)) {
              pitchDiagnostic(`Ornament "${op.lexeme}" is intended to be used with strings and arrays, but was applied to something unexpected here (${val.type})`, node, DiagnosticSeverity.Warning)
            }
            return new GasString(String(val.inner).split('').reverse().join(''))
          case Token.Minimum:
          case Token.Maximum:
          case Token.Sum:
            if (!val.is(GasArray)) {
              pitchDiagnostic(`Ornament "${op.lexeme}" must be applied to an array`, node)
              return val
            }
            if (val.inner.length === 0) {
              pitchDiagnostic(`Ornament "${op.lexeme}" can not be applied to an empty array`, node)
              return val
            }
            if (!val.isItems(GasNumber)) {
              pitchDiagnostic(`Ornament "${op.lexeme}" can only be applied to arrays with numeric values`, node)
              return val
            }
            if (op.type === Token.Minimum) {
              return new GasNumber(Math.min(...val.unwrap()))
            }
            if (op.type === Token.Maximum) {
              return new GasNumber(Math.max(...val.unwrap()))
            }
            if (op.type === Token.Sum) {
              return new GasNumber(val.unwrap().reduce((acc, n) => acc + n, 0))
            }
          case Token.Round:
          case Token.Ceil:
          case Token.Floor:
            if (!val.is(GasNumber)) {
              const sev = isNaN((val.inner as any)) ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning
              pitchDiagnostic(`Ornament "${op.lexeme}" is intended to be used with numbers, but was applied to something unexpected here (${val.type})`, node, sev)
              return val
            }
            switch (op.type) {
              case Token.Round: return new GasNumber(Math.round(val.inner))
              case Token.Ceil: return new GasNumber(Math.ceil(val.inner))
              case Token.Floor: return new GasNumber(Math.floor(val.inner))
            }
        }
        if (options.ornamentExtensions?.[op.lexeme]) {
          try {
            const fn = options.ornamentExtensions[op.lexeme]
            return GasValue.from(fn(val.unwrap()))
          } catch (err: any) {
            pitchDiagnostic(`Error evaluating custom hoisted ornament: ${err.toString()}`, node)
            return val
          }
        }
        try {
          const custom = stack.read(`:${op.lexeme}`)
          if (custom) {
            stack.push()
            stack.write('__scope', new GasStruct({ $input: val }), { environment: 'enclosure', mode: 'insert' })
            const v = resolveAstNode(custom.unwrap() as any, analyzeOnly)
            stack.pop()
            return v
          }
        } catch (err: any) {
          pitchDiagnostic(`Error evaluating custom ornament: ${err}`, node)
        }
        pitchDiagnostic(`Unknown ornament: "${op.lexeme}"`, node)
        return val
      case NodeType.UnaryExpr: {
        const op = node.value[0]
        const ex = resolveAstNode(node.value[1], analyzeOnly)
        if (op.type === Token.Not) {
          return new GasBoolean(!ex.inner)
        } else if (op.type === Token.Minus && ex.is(GasNumber)) {
          return new GasNumber(ex.inner * -1)
        }
        pitchDiagnostic(`Unknown unary operator: "${op.lexeme}"`, node)
        return ex
      }
      case NodeType.BinaryExpr: {
        const op = node.value[1]
        const a = resolveAstNode(node.value[0], analyzeOnly)
        const b = resolveAstNode(node.value[2], analyzeOnly)
        let wrap = (n: any) => GasValue.from(n)
        if (a.is(GasDate) || b.is(GasDate)) {
          wrap = (n: any) => new GasDate(new Date(n))
        }
        const left = (a.unwrap() as any).valueOf()
        const right = (b.unwrap() as any).valueOf()

        // Type mismatch
        switch (op.type) {
          case Token.Multiply:
          case Token.Divide:
            if (a.is(GasDuration)) {
              if (!b.is(GasNumber)) {
                pitchDiagnostic(`Expected a number, got a ${b.type} instead`, node.value[2], DiagnosticSeverity.Warning)
              }
            } else {
              if (!a.is(GasNumber)) {
                pitchDiagnostic(`Expected a number, got a ${a.type} instead`, node.value[0], DiagnosticSeverity.Warning)
              }
              if (!b.is(GasNumber)) {
                pitchDiagnostic(`Expected a number, got a ${b.type} instead`, node.value[2], DiagnosticSeverity.Warning)
              }
            }
          break
          case Token.Greater:
          case Token.GreaterEqual:
          case Token.Less:
          case Token.LessEqual:
          case Token.Equals:
          case Token.NotEquals:
            if (a.type !== b.type) {
              pitchDiagnostic(`Expected matching types, got a ${a.type} and ${b.type} instead`, node, DiagnosticSeverity.Warning)
            }
          break
          case Token.Includes:
            if (!a.is(GasArray) && !a.is(GasString)) {
              pitchDiagnostic(`Expected an array or string, got a ${a.type} instead`, node.value[0], DiagnosticSeverity.Warning)
            }
          break
          case Token.Matches:
            if (!a.is(GasString)) {
              pitchDiagnostic(`Expected a string, got ${a.type} instead`, node.value[0], DiagnosticSeverity.Warning)
            }
            if (!b.is(GasString)) {
              pitchDiagnostic(`Expected a string, got ${b.type} instead`, node.value[2], DiagnosticSeverity.Warning)
            }
          break
          case Token.Of:
            if (!b.is(GasArray) && !b.is(GasString)) {
              pitchDiagnostic(`Expected an array or string, got a ${b.type} instead`, node.value[2], DiagnosticSeverity.Warning)
            }
          break
        }

        switch (op.type) {
          case Token.Plus:
            if (Array.isArray(left)) {
              return new GasArray([ ...left.slice(), ...[right].flat(1) ].map((e) => GasValue.from(e)))
            }
            if (a.is(GasString) || b.is(GasString)) {
              return new GasString(a.toDisplay() + b.toDisplay())
            }
            return wrap(left + right)
          case Token.Minus:
            if (a.is(GasDate) && b.is(GasDate)) {
              const diff = Math.round((a.inner.getTime() - b.inner.getTime()) / 1_000)
              return new GasDuration(diff, DurationUnit.Second)
            }
            if (Array.isArray(left)) {
              const other = [right].flat(1)
              return new GasArray(left.filter((e) => !other.includes(e)).map((e) => GasValue.from(e)))
            }
            return wrap(left - right)
          case Token.Multiply: return new GasNumber(left * right)
          case Token.Divide: return new GasNumber(left / right)
          case Token.Greater: return new GasBoolean(left > right)
          case Token.GreaterEqual: return new GasBoolean(left >= right)
          case Token.Less: return new GasBoolean(left < right)
          case Token.LessEqual: return new GasBoolean(left <= right)
          case Token.Equals: return new GasBoolean(left == right)
          case Token.NotEquals: return new GasBoolean(left != right)
          case Token.Includes: return new GasBoolean(left?.includes?.(right))
          case Token.Matches:
            return new GasBoolean(
              a.is(GasString) && b.is(GasString) && left.toLowerCase().includes(right.toLowerCase())
            )
          case Token.Of: return new GasBoolean(Array.isArray(right) && right.includes(left))
          case Token.Modulo: return new GasNumber(left % right)
        }
        pitchDiagnostic(`Unknown binary operator: "${op.lexeme}"`, node)
        return new GasUnknown(undefined)
      }
      case NodeType.LogicalExpr: {
        const op = node.value[1]
        const left = resolveAstNode(node.value[0], analyzeOnly)
        let b: GasValue | undefined
        if (options.analyze) {
          b = resolveAstNode(node.value[2], true)
        }
        if (op.type === Token.Or && !!left.unwrap()) {
          return left
        }
        if (op.type === Token.And && !left.unwrap()) {
          return left
        }
        return b ?? resolveAstNode(node.value[2], analyzeOnly)
      }
      case NodeType.Variable:
        const value = stack.read(node.value)
        if (value === undefined) {
          pitchDiagnostic(`Undefined variable: ${node.value}`, node)
          return new GasUnknown(value)
        }
        return value
      case NodeType.BlockExpr: {
        stack.push()
        const out = resolveAstNode(node.value as IASTNode, analyzeOnly)
        stack.pop()
        return out
      }
      case NodeType.Grouping: return resolveAstNode(node.value, analyzeOnly)
      case NodeType.PrintStatement: {
        const v = resolveAstNode(node.value, analyzeOnly)
        console.log(v.unwrap())
        return v
      }
      case NodeType.ExprStatement: return resolveAstNode(node.value, analyzeOnly)
      case NodeType.StatementList: {
        let v: GasValue = new GasUnknown(undefined)
        node.value.forEach((n) => {
          v = resolveAstNode(n, analyzeOnly)
        })
        return v
      }
      case NodeType.DeclareStatement: {
        const key = node.value[0].lexeme
        const value = resolveAstNode(node.value[1], analyzeOnly)
        try {
          stack.write(key, value)
        } catch (err: any) {
          pitchDiagnostic(err.toString(), node)
        }
        return value
      }
      case NodeType.DefineStatement: {
        const key = node.value[0].lexeme
        try {
          stack.write(`:${key}`, GasValue.from(node.value[1]), { environment: 'local', mode: 'insert' })
        } catch (err: any) {
          pitchDiagnostic(err.toString(), node)
        }
        return new GasUnknown(undefined)
      }
      case NodeType.AssignStatement: {
        const key = node.value[0]
        let value = resolveAstNode(node.value[1], analyzeOnly)
        const { type } = node.value[2]
        const prev = stack.read(key)
        if (prev === undefined) {
          pitchDiagnostic('Left-hand side resolves to nothing', node)
          return value
        }
        switch (type) {
          case Token.PlusEquals:
            if (prev.is(GasArray)) {
              value = new GasArray(prev.unwrap().concat(...[value.unwrap()].flat(1)).map((e) => GasValue.from(e)))
              break
            }
            if (prev.is(GasString)) {
              value = new GasString(prev.inner + value.inner)
              break
            }
            if (prev.is(GasNumber) && value.is(GasNumber)) {
              value = new GasNumber(prev.inner + value.inner)
              break
            }
          break
          case Token.MinusEquals:
            if (prev.is(GasArray)) {
              const other = [value.unwrap()].flat(1)
              value = new GasArray(prev.unwrap().filter((e) => !other.includes(e)).map((e) => GasValue.from(e)))
              break
            }
            if (prev.is(GasNumber) && value.is(GasNumber)) {
              value = new GasNumber(prev.inner - value.inner)
            }
          break
          case Token.MultiplyEquals:
            if (prev.is(GasNumber) && value.is(GasNumber)) {
              value = new GasNumber(prev.inner * value.inner)
            } else {
              pitchDiagnostic(`Attempt to multiply non-numeric types (${prev.type} and ${value.type})`, node)
            }
          break
          case Token.DivideEquals:
            if (prev.is(GasNumber) && value.is(GasNumber)) {
              value = new GasNumber(prev.inner / value.inner)
            } else {
              pitchDiagnostic(`Attempt to divide non-numeric types (${prev.type} and ${value.type})`, node)
            }
          break
        }
        if (prev.type !== value.type) {
          pitchDiagnostic(`Variable type changed from ${prev.type} to ${value.type}`, node, DiagnosticSeverity.Warning)
        }
        try {
          if (!analyzeOnly) {
            stack.write(key, value, { mode: 'update' })
          }
        } catch (err: any) {
          pitchDiagnostic(err.toString(), node)
        }
        return value
      }
      case NodeType.IfStatement: {
        const cond = resolveAstNode(node.value[0], analyzeOnly)
        if (!!cond.inner) {
          if (options.analyze && node.value[2]) {
            resolveAstNode(node.value[2], true)
          }
          return resolveAstNode(node.value[1], analyzeOnly)
        } else if (node.value[2]) {
          return resolveAstNode(node.value[2], analyzeOnly)
        }
        if (options.analyze) {
          resolveAstNode(node.value[1], true)
        }
        return new GasUnknown(undefined)
      }
      case NodeType.IterStatement: {
        const items = resolveAstNode(node.value[0], analyzeOnly)
        const out = []
        if (!items.is(GasArray)) {
          pitchDiagnostic('Not iterable', node.value[0])
          return items
        }
        let idx = 0
        for (const item of items.inner) {
          stack.push()
          stack.write('__scope', item)
          stack.write('__index', new GasNumber(idx))
          if (node.value[2]) {
            stack.write(node.value[2].lexeme, item)
          }
          out.push(resolveAstNode(node.value[1], analyzeOnly))
          stack.pop()
          idx += 1
        }
        return new GasArray(out)
      }
      case NodeType.Collection: return new GasArray(node.value.map((n) => resolveAstNode(n, analyzeOnly)))
      case NodeType.TakeStatement: {
        node.value.map((n) => resolveAstNode(n, analyzeOnly))
        return new GasUnknown(undefined)
      }
      case NodeType.ValidateStatement: {
        validateCounter += 1
        let label = undefined
        if (node.value[1]) {
          label = String(resolveAstNode(node.value[1], analyzeOnly).inner)
        }
        for (const statement of node.value[0]) {
          try {
            resolveAstNode(statement, analyzeOnly)
          } catch (err) {
            if (!options.ignoreErrors) {
              throw err
            }
          }
        }
        validateCounter -= 1
        const vr = new ValidationResults(rejects.splice(0, rejects.length), label)
        validationResults.push(vr)
        return new GasUnknown(vr)
      }
      case NodeType.RejectStatement: {
        const value = resolveAstNode(node.value, analyzeOnly)
        if (value && !analyzeOnly) {
          const err = new RejectMessage(value.toDisplay(), node.start, node.value.end)
          rejects.push(err)
          if (validateCounter === 0) {
            throw err
          }
        }
        return new GasUnknown(undefined)
      }
      case NodeType.InspectExpr: {
        return resolveAstNode(node.value, analyzeOnly)
      }
      case NodeType.MetaKeyword: {
        if (node.value.type === Token.Index) {
          const value = stack.read('__index')
          if (value !== undefined) {
            return value
          }
          pitchDiagnostic('Index undefined', node)
        }
        if (node.value.type === Token.This) {
          const value = stack.read('__scope')
          if (value !== undefined) {
            return value
          }
          pitchDiagnostic('Reference to scope in invalid context', node)
        }
        return new GasUnknown(undefined)
      }
    }
  }

  const run = (...nodes: IASTNode[]) => {
    cursor = 0
    stack.flush()
    let output: GasValue = new GasUnknown(undefined)
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
      output.unwrap(),
      validationResults.splice(0, validationResults.length),
      diagnostics,
      trace,
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
  value: GasValue
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

  const read = (key: string): GasValue | undefined => {
    const parts = key.split('.')
    let item = _findInStack(parts.shift()!)
    while (item && parts.length > 0) {
      const next = parts.shift()!
      if (!item.value.is(GasStruct) || !(next in item.value.inner)) {
        return undefined
      }
      item = {
        ...item,
        value: item.value.inner[next],
      }
    }
    return item?.value
  }
  const write = <T extends GasValue> (key: string, value: T, config: IStackWriteConfig = {}) => {
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
