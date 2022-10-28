import { createInterpreter } from './interpreter'
import { generateAST } from './parser'
import { scanSource } from './scanner'

export const evaluate = (script: string, data?: { [key: string]: any }) => {
  const [ tokens, errs ] = scanSource(script)
  if (errs.length > 0) {
    throw new Error(`Errors (${errs.length}) occurred parsing source: ${errs[0].msg}`)
  }
  const tree = generateAST(tokens)
  const interpreter = createInterpreter(data)
  return interpreter.run(tree)
}
