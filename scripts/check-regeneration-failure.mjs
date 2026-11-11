// Exercise the Vercel build or an actual warmed lab standalone artifact against an unreachable DB.
import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, chmodSync, readdirSync } from 'node:fs'
import { join, resolve, basename } from 'node:path'
import { tmpdir } from 'node:os'
import { spawn, execFileSync } from 'node:child_process'
import { createServer } from 'node:net'
import { once } from 'node:events'
import { randomBytes } from 'node:crypto'
import { deserialize } from 'node:v8'

const temp = mkdtempSync(join(tmpdir(), 'govgraph-outage-'))
const lab = process.env.LAB_RUNTIME_ARTIFACT
const app = lab ? join(temp, 'app') : temp
const secret = randomBytes(24).toString('hex')
let server
function writable(dir) {
	chmodSync(dir, 0o755)
	for (const entry of readdirSync(dir,{withFileTypes:true})) {
		if(entry.isSymbolicLink()) continue
		const file=join(dir,entry.name)
		if(entry.isDirectory()) writable(file);else chmodSync(file,0o644)
	}
}
try {
	if (lab) {
		cpSync(lab, app, { recursive: true })
		const config=JSON.parse(readFileSync(join(app,'.next/required-server-files.json'),'utf8')).config
		assert.equal(config.env.NEXT_PUBLIC_LAB_BUILD,'1')
		assert(config.cacheHandler?.endsWith('cache-handler.cjs'),'Must exercise the actual lab cache')
		assert(deserialize(readFileSync(join(app,'.next/cache/lab/manifest'))).entries.length>0,'Warm lab cache is required')
	} else {
		cpSync('.next', join(app, '.next'), { recursive: true, filter: (path) => !['cache', 'dev'].includes(basename(path)) })
		for (const path of ['next.config.ts', 'package.json']) cpSync(path, join(app, path))
		symlinkSync(resolve('node_modules'), join(app, 'node_modules'), 'dir')
	}
	const probe = createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening')
	const port=probe.address().port;await new Promise(done=>probe.close(done))
	const args=lab ? ['server.js'] : [resolve('node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port',String(port)]
	server=spawn(process.execPath,args,{cwd:app,env:{...process.env,DATABASE_URL:'postgres://unavailable@127.0.0.1:1/unavailable',CRON_SECRET:secret,HOSTNAME:'127.0.0.1',PORT:String(port)},stdio:'ignore'})
	const url=`http://127.0.0.1:${port}`
	const read=(path,id,extra=[])=>{
		const headers=join(temp,`${id}.headers`),body=join(temp,`${id}.body`)
		const status=Number(execFileSync('curl',['-sS','--max-time','45','-D',headers,'-o',body,'-w','%{http_code}',...extra,url+path],{encoding:'utf8',stdio:['ignore','pipe','ignore']}))
		return {status,body:readFileSync(body,'utf8'),headers:readFileSync(headers,'utf8')}
	}
	let before
	for(let i=0;i<100;i++) {try{before=read('/ng','before');break}catch{await new Promise(done=>setTimeout(done,100))}}
	assert(before,'Isolated server did not start');assert.equal(before.status,200)
	const malformed=read('/api/graph/not-a-version','malformed')
	assert.equal(malformed.status,404);assert(Buffer.byteLength(malformed.body)<1024);assert.doesNotMatch(malformed.headers,/immutable/i)
	if(lab) {
		const invalidation=read('/api/revalidate','invalidate',['-X','POST','-H',`Authorization: Bearer ${secret}`])
		assert.equal(invalidation.status,200)
		assert(deserialize(readFileSync(join(app,'.next/cache/lab/manifest'))).tags['ng-stored-data']>0,'Acknowledgement must include persisted invalidation')
		const stale=read('/ng','stale');assert.equal(stale.status,200);assert.equal(stale.body,before.body,'Tag invalidation during outage must serve the last good page');assert.match(stale.headers,/cache-control: no-store/i,'Stale fallback must not refill the edge cache')
	}
	const {preview}=JSON.parse(readFileSync(join(app,'.next/prerender-manifest.json'),'utf8'))
	const regeneration=read('/ng','regeneration',['-H',`x-prerender-revalidate: ${preview.previewModeId}`])
	assert.equal(regeneration.status,500,'Forced DB regeneration must fail')
	const after=read('/ng','after');assert.equal(after.status,200);assert.equal(after.body,before.body,'Failed regeneration replaced the last good page')
	const graph=read(`/api/graph/${randomBytes(8).toString('hex')}`,'failed-graph')
	assert.equal(graph.status,500);assert.doesNotMatch(graph.headers,/immutable/i)
	console.log(`PASS: ${lab?'actual standalone lab artifact; durable tag invalidation during outage serves last good HTML; ':''}forced regeneration 500; prior page byte-identical 200; tiny invalid-version 404; cold graph fails without immutable caching.`)
} finally {
	if(server && server.exitCode===null){server.kill('SIGTERM');await once(server,'exit')}
	writable(temp);rmSync(temp,{recursive:true,force:true})
}
