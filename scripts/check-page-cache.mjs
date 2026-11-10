// Run after `next build` and `next start`: node scripts/check-page-cache.mjs [origin]
// This checks the production behavior, rather than matching implementation source text.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const origin = process.argv[2] ?? 'http://127.0.0.1:3127'
const temp = mkdtempSync(join(tmpdir(), 'govgraph-cache-'))
try {
	const read = (path, index) => {
		const headerFile = join(temp, `${index}.headers`)
		const bodyFile = join(temp, `${index}.body`)
		const status = execFileSync('curl', ['--max-time', '30', '-sS', '-D', headerFile, '-o', bodyFile, '-w', '%{http_code}', origin + path], { encoding: 'utf8' })
		const headers = readFileSync(headerFile, 'utf8')
		const body = readFileSync(bodyFile, 'utf8')
		assert.equal(status, '200', path)
		assert.match(headers, /cache-control:/i, `${path} must be cacheable`)
		assert.doesNotMatch(headers, /(?:no-store|private)/i, `${path} bypasses the public cache`)
		return { headers, body }
	}
	const home = read('/ng', 0)
	const homeAgain = read('/ng', 1)
	const query = read('/ng?layer=state&days=7', 2)
	assert.equal(home.body, homeAgain.body, 'Homepage must reuse its cached representation')
	assert.equal(home.body, query.body, 'Query controls must not create server-rendered variants')
	for (const page of [home, read('/ng/departments/ng-ministry-of-finance', 3), read('/ng/departments/ng-ministry-of-finance', 4)]) {
		assert(Buffer.byteLength(page.body) < 150_000, 'Page HTML exceeds the 150 KB regression budget')
		assert(!page.body.includes('connectedNodes'), 'The full graph leaked into page HTML')
	}
	const resource = read('/api/graph', 5)
	assert.match(resource.headers, /max-age=300/, 'Graph must be reusable by the browser')
	const { graph } = JSON.parse(resource.body)
	assert(Object.keys(graph.nodes).length > 0 && Object.keys(graph.edges).length > 0, 'Shared graph resource is empty')
	console.log('PASS: cached homepage and query deep link; lean entity HTML; one browser-cacheable graph resource.')
} finally {
	rmSync(temp, { recursive: true, force: true })
}
