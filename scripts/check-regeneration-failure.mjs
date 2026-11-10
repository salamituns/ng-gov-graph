// Build with real data first. This test copies the build, drops only that copy's data cache,
// and runs it against an unreachable database. It never reads or modifies the real database.
import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs'
import { join, resolve, basename } from 'node:path'
import { tmpdir } from 'node:os'
import { spawn, execFileSync } from 'node:child_process'
import { createServer } from 'node:net'
import { once } from 'node:events'

const temp = mkdtempSync(join(tmpdir(), 'govgraph-outage-'))
let server
try {
	cpSync('.next', join(temp, '.next'), { recursive: true, filter: (path) => !['cache', 'dev'].includes(basename(path)) })
	for (const path of ['next.config.ts', 'package.json']) cpSync(path, join(temp, path))
	symlinkSync(resolve('node_modules'), join(temp, 'node_modules'), 'dir')
	const probe = createServer()
	probe.listen(0, '127.0.0.1')
	await once(probe, 'listening')
	const port = probe.address().port
	await new Promise((done) => probe.close(done))
	server = spawn(process.execPath, [resolve('node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
		cwd: temp,
		env: { ...process.env, DATABASE_URL: 'postgres://unavailable@127.0.0.1:1/unavailable' },
		stdio: 'ignore',
	})
	const url = `http://127.0.0.1:${port}`
	const read = (path, id, extra = []) => {
		const headerFile = join(temp, `${id}.headers`)
		const bodyFile = join(temp, `${id}.body`)
		const status = Number(execFileSync('curl', ['-sS', '--max-time', '45', '-D', headerFile, '-o', bodyFile, '-w', '%{http_code}', ...extra, url + path], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))
		return { status, body: readFileSync(bodyFile, 'utf8'), headers: readFileSync(headerFile, 'utf8') }
	}
	let before
	for (let i = 0; i < 100; i++) {
		try { before = read('/ng', 'before'); break } catch { await new Promise((done) => setTimeout(done, 100)) }
	}
	assert(before, 'Isolated server did not start')
	assert.equal(before.status, 200)
	const { preview } = JSON.parse(readFileSync(join(temp, '.next/prerender-manifest.json'), 'utf8'))
	// This internal build-only token is used without logging it.
	const regeneration = read('/ng', 'regeneration', ['-H', `x-prerender-revalidate: ${preview.previewModeId}`])
	assert.equal(regeneration.status, 500, 'A cold regeneration against a failed database must reject, not cache catalog data')
	const after = read('/ng', 'after')
	assert.equal(after.status, 200)
	assert.equal(after.body, before.body, 'Failed regeneration replaced the last good page')
	const graph = read('/api/graph/0000000000000000', 'failed-graph')
	assert.equal(graph.status, 500)
	assert.doesNotMatch(graph.headers, /immutable/i, 'A failed graph response must never be immutable')
	console.log('PASS: DB outage rejects regeneration (500); previous page remains byte-identical (200); failed graph is not immutable.')
} finally {
	if (server && server.exitCode === null) {
		server.kill('SIGTERM')
		await once(server, 'exit')
	}
	rmSync(temp, { recursive: true, force: true })
}
