// Entry point for running the API as a single Vercel Function.
//
// The frontend calls the API under /api (same origin, no CORS setup). The
// Express app itself is mounted at the root, so strip the /api prefix
// before handing the request over. Bundled by scripts/build-vercel.mjs.
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createApp } from './app.js'

const app = createApp()

export function stripApiPrefix(url: string): string {
  const stripped = url.replace(/^\/api(?=\/|\?|$)/, '')
  return stripped === '' || stripped.startsWith('?') ? `/${stripped}` : stripped
}

export default function handler(req: IncomingMessage, res: ServerResponse) {
  req.url = stripApiPrefix(req.url ?? '/')
  return app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1])
}
