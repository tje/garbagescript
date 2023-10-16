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

export { scanSource } from './scanner.js'
export { Token } from './tokens.js'
export { generateAST, ParseError } from './parser.js'
export { createInterpreter, InterpreterDiagnostic, TraceEntry } from './interpreter.js'
