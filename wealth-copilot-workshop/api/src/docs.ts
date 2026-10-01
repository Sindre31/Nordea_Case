// Loads and parses the OpenAPI specification for Swagger UI and the raw
// /openapi.json endpoint. The YAML file lives next to the compiled source
// (see the "copy-assets" step in package.json's build script) so this
// works identically in dev (tsx, reading from src/) and in the built
// dist/ output.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function loadOpenApiSpec(): Record<string, unknown> {
  const filePath = path.join(__dirname, 'openapi.yaml')
  const raw = readFileSync(filePath, 'utf8')
  return parse(raw) as Record<string, unknown>
}
