// Builds the whole app for Vercel using the Build Output API
// (https://vercel.com/docs/build-output-api):
//
//   .vercel/output/static/          the Vite frontend
//   .vercel/output/functions/api.func/  the Express API as ONE function
//   .vercel/output/config.json      routes: /api/* -> function, rest -> static
//
// Why not zero-config? Vercel turns every file in a top-level `api/` folder
// into its own function, but here `api/` is a full Express project. Building
// the output ourselves keeps the repo layout unchanged and the result
// predictable. vercel.json uses an explicit `builds` entry so Vercel runs only
// this script (`npm run vercel-build`) and skips its `api/` auto-detection.
import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, '.vercel', 'output')
const func = path.join(out, 'functions', 'api.func')

rmSync(out, { recursive: true, force: true })
mkdirSync(func, { recursive: true })

// 1) Data. Generated JSON is committed, but regenerate if it is missing.
if (!existsSync(path.join(root, 'data', 'customers.json'))) {
  execSync('npm run generate-data', { cwd: root, stdio: 'inherit' })
}

// 2) Frontend, pointed at the same-origin API.
execSync('npm run build --workspace frontend', {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, VITE_API_URL: process.env.VITE_API_URL ?? '/api' },
})
cpSync(path.join(root, 'frontend', 'dist'), path.join(out, 'static'), { recursive: true })

// 3) API function: bundle everything except Swagger UI, which serves its
// static assets from its own package folder and is copied alongside.
const external = ['swagger-ui-express', 'swagger-ui-dist']
await build({
  entryPoints: [path.join(root, 'api', 'src', 'vercel.ts')],
  outfile: path.join(func, 'index.mjs'),
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  external,
  // Express is CommonJS; give the ESM bundle a working `require`.
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  logLevel: 'info',
})
for (const pkg of external) {
  cpSync(path.join(root, 'node_modules', pkg), path.join(func, 'node_modules', pkg), { recursive: true, dereference: true })
}
cpSync(path.join(root, 'api', 'src', 'openapi.yaml'), path.join(func, 'openapi.yaml'))
mkdirSync(path.join(func, 'data'))
for (const file of ['customers.json', 'accounts.json', 'transactions.json', 'investments.json', 'market_data.json', 'goals.json']) {
  cpSync(path.join(root, 'data', file), path.join(func, 'data', file))
}
writeFileSync(path.join(func, 'package.json'), JSON.stringify({ type: 'module' }, null, 2))
writeFileSync(path.join(func, '.vc-config.json'), JSON.stringify({
  runtime: 'nodejs22.x',
  handler: 'index.mjs',
  launcherType: 'Nodejs',
  maxDuration: 30,
}, null, 2))

// 4) Routing.
writeFileSync(path.join(out, 'config.json'), JSON.stringify({
  version: 3,
  routes: [
    { src: '^/api(?:/.*)?$', dest: '/api' },
    { handle: 'filesystem' },
    { src: '/.*', dest: '/index.html' },
  ],
}, null, 2))

console.log('Vercel build output written to .vercel/output')
