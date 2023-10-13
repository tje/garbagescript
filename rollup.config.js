import { defineConfig } from 'rollup'
import ts from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'

export default defineConfig({
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/bundle.mjs',
      format: 'esm',
    },
    {
      file: 'dist/bundle.min.mjs',
      format: 'esm',
      plugins: [terser()],
    },
  ],
  plugins: [
    ts({
      tsconfig: './tsconfig.json',
    }),
  ],
})
