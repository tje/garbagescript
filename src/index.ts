import { IInterpreterOptions, createInterpreter } from './interpreter.js'
import { generateAST } from './parser.js'
import { scanSource } from './scanner.js'

type SubjectData = { [key: string]: any }

const _evaluate = (script: string, subjectData?: SubjectData, options?: Omit<IInterpreterOptions, 'subjectData'>) => {
  const [ tokens, errs ] = scanSource(script)
  if (errs.length > 0 && !options?.ignoreErrors) {
    throw new Error(`Errors (${errs.length}) occurred parsing source: ${errs[0].msg}`)
  }
  const tree = generateAST(tokens)
  const interpreter = createInterpreter({
    subjectData,
    ...options,
  })
  return interpreter.run(tree)
}

export const evaluate = (script: string, subjectData?: SubjectData, options?: Omit<IInterpreterOptions, 'subjectData'>) => {
  return _evaluate(script, subjectData, options).output
}

export const validate = (script: string, subjectData?: SubjectData, options?: Omit<IInterpreterOptions, 'subjectData'>) => {
  return _evaluate(script, subjectData, options)
}

export const createScript = (script: string, options: IInterpreterOptions = {}) => {
  let _tree!: ReturnType<typeof generateAST>
  let _script: string

  const _compile = (script: string) => {
    const [ tokens, errs ] = scanSource(script)
    if (errs.length > 0 && !options?.ignoreErrors) {
      throw new Error(`Errors (${errs.length}) occurred parsing source: ${errs[0].msg}`)
    }
    _tree = generateAST(tokens)
    _script = script
  }

  const _execute = (subjectData?: SubjectData) => {
    const { run } = createInterpreter({
      ...options,
      subjectData: {
        ...options.subjectData,
        ...subjectData,
      },
    })
    return run(_tree)
  }

  const evaluate = (subjectData?: SubjectData) => {
    return _execute(subjectData).output
  }

  const validate = (subjectData?: SubjectData) => {
    return _execute(subjectData)
  }

  _compile(script)

  return {
    get script () {
      return _script
    },
    set script (s) {
      _compile(s)
    },
    evaluate,
    validate,
  }
}

export { scanSource } from './scanner.js'
export { Token } from './tokens.js'
export { generateAST, ParseError } from './parser.js'
export { createInterpreter, InterpreterDiagnostic, TraceEntry } from './interpreter.js'
export { extractDeclarations } from './utils.js'
