// Run after `next build` and `next start`: node scripts/check-page-cache.mjs [origin]
// This checks the production behavior, rather than matching implementation source text.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { createHash } from 'node:crypto'

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
	assert.match(home.body, /class="panel-card trending"/, 'Trending card must be in cached HTML')
	assert.doesNotMatch(home.body, />Invalid Date</, 'Invalid feed date leaked into HTML')
	const themeScript = home.body.match(/<script[^>]*>(try\{if\([\s\S]*?)<\/script>/)?.[1]
	assert(themeScript, 'Homepage pre-paint script is missing')
	for (const search of ['', '?utm_source=test', '?layer=state&days=7', '?days=7']) {
		const dataset = {}
		const timers = []
		runInNewContext(themeScript, {
			location: { pathname: '/ng', search }, URLSearchParams,
			document: { cookie: '', documentElement: { dataset, classList: { toggle() {} } } },
			localStorage: { getItem: () => null }, matchMedia: () => ({ matches: false }),
			setTimeout: (callback, delay) => timers.push({ callback, delay }),
		})
		const needsQuery = new URLSearchParams(search).has('layer') || new URLSearchParams(search).has('days')
		assert.equal(dataset.homeQueryPending === 'true', needsQuery, `Unexpected pending flag for /ng${search}`)
		assert.equal(timers.length, needsQuery ? 1 : 0)
		if (needsQuery) {
			assert.equal(timers[0].delay, 2500)
			timers[0].callback()
			assert.equal(dataset.homeQueryPending, undefined, 'Content must show even without hydration')
		}
	}
	const entity = read('/ng/departments/ng-ministry-of-finance', 3)
	assert.match(entity.body, /class="sheet-title">[^<]*Finance[^<]*<\/p>/, 'Entity sheet title must exist before the graph download')
	for (const page of [home, entity, read('/ng/departments/ng-ministry-of-finance', 4)]) {
		assert(Buffer.byteLength(page.body) < 150_000, 'Page HTML exceeds the 150 KB regression budget')
		assert(!page.body.includes('connectedNodes'), 'The full graph leaked into page HTML')
	}
	const graphUrl = home.body.match(/\/api\/graph\/[a-f0-9]{16}/)?.[0]
	assert(graphUrl, 'HTML must carry a versioned graph URL')
	assert(home.body.match(/<link\b[^>]*>/g)?.some((tag) => tag.includes('rel="preload"') && tag.includes('as="fetch"') && tag.includes('crossorigin="anonymous"') && tag.includes(`href="${graphUrl}"`)), 'Exact graph URL must be preloaded with anonymous fetch credentials')
	const resource = read(graphUrl, 5)
	assert.match(resource.headers, /max-age=31536000/, 'Versioned graph must have a long browser cache lifetime')
	assert.match(resource.headers, /immutable/i, 'Versioned graph must be immutable')
	const version = createHash('sha256').update(resource.body).digest('hex').slice(0, 16)
	assert.equal(graphUrl, `/api/graph/${version}`, 'HTML version must match the JSON content')
	const { graph } = JSON.parse(resource.body)
	assert(Object.keys(graph.nodes).length > 0 && Object.keys(graph.edges).length > 0, 'Shared graph resource is empty')
	const older = read('/api/graph/0000000000000000', 6)
	assert(Object.keys(JSON.parse(older.body).graph.nodes).length > 0, 'Older HTML versions must still load usable graph data')
	assert.doesNotMatch(older.headers, /immutable/i, 'Wrong version must never be immutable')
	assert.match(older.headers, /max-age=60(?:\D|$)/i)
	const legacy = read('/api/graph?v=unchecked', 7)
	assert.doesNotMatch(legacy.headers, /immutable/i, 'Unchecked legacy URL must never be immutable')
	const topicPath = home.body.match(/href="(\/ng\/topics\/[^"?]+)"/)?.[1]
	assert(topicPath, 'Trending topic link is missing')
	const topic = read(topicPath, 8)
	assert.match(topic.body, /outlets this week/, 'Topic weekly coverage must be in cached HTML')
	console.log('PASS: cached lean pages with trending and entity titles; preload; checked immutable versions; short-cache mismatch; weekly coverage; query timeout fallback.')
} finally {
	rmSync(temp, { recursive: true, force: true })
}
