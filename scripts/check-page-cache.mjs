// Run after `next build` and `next start`: node scripts/check-page-cache.mjs [origin]
// This checks the production behavior, rather than matching implementation source text.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, mkdtempSync, rmSync, readdirSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { createHash, randomBytes } from 'node:crypto'

const origin = process.argv[2] ?? 'http://127.0.0.1:3127'
const temp = mkdtempSync(join(tmpdir(), 'govgraph-cache-'))
try {
	const read = (path, index, { expectedStatus = '200', extra = [] } = {}) => {
		const headerFile = join(temp, `${index}.headers`)
		const bodyFile = join(temp, `${index}.body`)
		const status = execFileSync('curl', ['--max-time', '30', '-sS', '-D', headerFile, '-o', bodyFile, '-w', '%{http_code}', ...extra, origin + path], { encoding: 'utf8' })
		const headers = readFileSync(headerFile, 'utf8')
		const body = readFileSync(bodyFile, 'utf8')
		assert.equal(status, expectedStatus, path)
		assert.match(headers, /cache-control:/i, `${path} must be cacheable`)
		assert.doesNotMatch(headers, /(?:no-store|private)/i, `${path} bypasses the public cache`)
		return { headers, body }
	}
	const home = read('/ng', 0)
	const homeAgain = read('/ng', 1)
	const query = read('/ng?layer=state&days=7', 2)
	assert.equal(home.body, homeAgain.body, 'Homepage must reuse its cached representation')
	assert.equal(home.body, query.body, 'Query controls must not create server-rendered variants')
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
	const outputDir = '.next/server/app/api/graph'
	const listOutputs = () => readdirSync(outputDir, { recursive: true }).filter((path) => statSync(join(outputDir, path)).isFile()).sort()
	const outputsBefore = listOutputs()
	const resource = read(graphUrl, 5)
	assert.match(resource.headers, /max-age=31536000/, 'Versioned graph must have a long browser cache lifetime')
	assert.match(resource.headers, /immutable/i, 'Versioned graph must be immutable')
	assert.match(resource.headers, /(?:^|[,\s])s-maxage=31536000(?:\D|$)/i, 'Canonical graph must be cacheable by the CDN')
	const version = createHash('sha256').update(resource.body).digest('hex').slice(0, 16)
	assert.equal(graphUrl, `/api/graph/${version}`, 'HTML version must match the JSON content')
	const { graph, news } = JSON.parse(resource.body)
	// A stopped refresh feed eventually has no eligible weekly trends. Check the actual rendering contract.
	const expectedTrends = Number(execFileSync(process.execPath, ['--import', 'tsx', '-e', `const { trendingTopics } = require('./src/lib/graph/trending.ts'); const { CIVIC_TOPICS } = require('./src/data/nigeria/topics.ts'); let input='';process.stdin.on('data',d=>input+=d);process.stdin.on('end',()=>console.log(trendingTopics(JSON.parse(input),CIVIC_TOPICS,new Date()).topics.length));`], { input: JSON.stringify(news), encoding: 'utf8' }))
	assert.equal(home.body.includes('class="panel-card trending"'), expectedTrends > 0, 'Cached trending card must match eligible current-week coverage')
	assert(Object.keys(graph.nodes).length > 0 && Object.keys(graph.edges).length > 0, 'Shared graph resource is empty')
	for (const candidate of ['0000000000000000', ...Array.from({ length: 5 }, () => randomBytes(8).toString('hex'))]) {
		if (candidate === version) continue
		const older = read(`/api/graph/${candidate}`, `redirect-${candidate}`, { expectedStatus: '307' })
		assert.match(older.headers, new RegExp(`^location: ${graphUrl}$`, 'im'), 'Old HTML must redirect to the canonical graph')
		assert(Buffer.byteLength(older.body) < 1024, 'Mismatched version must not return the full graph')
		assert.doesNotMatch(older.headers, /immutable/i)
		assert.match(older.headers, /max-age=60(?:\D|$)/i)
	}
	const followed = read('/api/graph/0000000000000000', 'followed', { extra: ['-L'] })
	assert.equal(followed.body, resource.body, 'Following an old URL must return the canonical JSON')
	for (const candidate of ['garbage', 'ABCDEF0123456789', 'f'.repeat(17), '0000000000000000%0A', 'not%2Fa%2Fversion']) {
		const invalid = read(`/api/graph/${candidate}`, `invalid-${encodeURIComponent(candidate)}`, { expectedStatus: '404' })
		assert(Buffer.byteLength(invalid.body) < 1024)
		assert.doesNotMatch(invalid.headers, /immutable/i)
		assert.match(invalid.headers, /max-age=60(?:\D|$)/i)
	}
	const legacy = read('/api/graph?v=unchecked', 7)
	assert.doesNotMatch(legacy.headers, /immutable/i, 'Unchecked legacy URL must never be immutable')
	const topicPath = home.body.match(/href="(\/ng\/topics\/[^"?]+)"/)?.[1]
	if (expectedTrends > 0) assert(topicPath, 'Trending topic link is missing')
	const topic = read(topicPath ?? '/ng/topics/fuel-prices', 8)
	assert.match(topic.body, expectedTrends > 0 ? /outlets this week/ : /in the news we follow/, 'Topic summary must be in cached HTML')
	const outputsAfter = listOutputs()
	assert.deepEqual(outputsAfter, outputsBefore, 'Attacker-controlled versions created per-path ISR files')
	console.log(JSON.stringify({ graphFilesBefore: outputsBefore, graphFilesAfter: outputsAfter }, null, 2))
	console.log('PASS: lean cached pages; canonical CDN-cacheable graph; tiny redirects/404s; old URL follows correctly; no per-version ISR files.')
} finally {
	rmSync(temp, { recursive: true, force: true })
}
