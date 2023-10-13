import { defineConfig } from 'rollup'
import dts from 'rollup-plugin-dts'

export default defineConfig({
  input: 'dist/index.d.ts',
  output: [
    {
      file: 'dist/bundle.d.ts',
      format: 'es',
    },
  ],
  plugins: [
    dts(),
  ],
})
