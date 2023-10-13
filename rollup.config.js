import { defineConfig } from 'rollup'
import ts from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'
import terser from '@rollup/plugin-terser'

export default defineConfig([
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.mjs',
        format: 'esm',
      },
      {
        file: 'dist/index.cjs',
        format: 'cjs',
      },
    ],
    plugins: [
      terser(),
      ts(),
    ],
  },
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'es',
    },
    plugins: [
      dts(),
    ],
  }
])
