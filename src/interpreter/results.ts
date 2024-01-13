import { IASTNode } from '../parser.js'
import { GasValue } from '../value/value.js'

export class RejectMessage extends Error {
  constructor (private _msg: string, private _start: number, private _end: number, private _subject?: GasValue) {
    super(_msg)
  }

  public get reason () {
    return this._msg
  }

  public get subject () {
    return this._subject
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
