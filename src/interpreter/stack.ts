import { GasStruct, GasValue } from '../value/value.js'

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
