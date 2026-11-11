import { build } from 'esbuild'
import { mkdir } from 'node:fs/promises'

await mkdir('build', { recursive: true })
const common = { bundle: true, platform: 'node', target: 'node24', format: 'esm', tsconfig: 'tsconfig.json', logLevel: 'warning' }
await build({ ...common, entryPoints: ['scripts/refresh-entry.ts'], outfile: 'build/refresh.mjs', external: ['./refresh-persist.mjs'] })
await build({ ...common, entryPoints: ['scripts/refresh-persist.ts'], outfile: 'build/refresh-persist.mjs', banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" } })
