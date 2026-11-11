import { cp, rm, mkdir, readFile, readdir } from 'node:fs/promises'

if (process.env.LAB_BUILD === '1') {
	await import('./bundle-refresh.mjs')
	const runtime = '.next/standalone'
	await cp('public', `${runtime}/public`, { recursive: true })
	await cp('.next/static', `${runtime}/.next/static`, { recursive: true })
	await cp('scripts/start-lab.mjs', `${runtime}/start.mjs`)
	for (const file of ['refresh.mjs', 'refresh-persist.mjs']) await cp(`build/${file}`, `${runtime}/${file}`)
	// Next tracing may copy local dotenv files. They are never part of the image/runtime artifact.
	for (const file of await readdir(runtime)) if (file.startsWith('.env')) await rm(`${runtime}/${file}`, { force: true })
	for (const directory of ['.next/cache', '.next/server/route-cache']) {
		await rm(`${runtime}/${directory}`, { recursive: true, force: true })
		await mkdir(`${runtime}/${directory}`, { recursive: true })
	}
	// Keep compiled modules and static metadata. Data-bearing prerenders must generate from runtime DB.
	const app = `${runtime}/.next/server/app`
	for (const file of await readdir(app, { recursive: true })) {
		if (/^(ng(?:[/.])|api\/graph(?:[/.]))/.test(file) && /\.(html|rsc|meta|body)$/.test(file)) {
			await rm(`${app}/${file}`)
		}
	}
	// Runtime uses traced production dependencies only, never the root development toolchain.
	const pkg = JSON.parse(await readFile('package.json', 'utf8'))
	for (const name of Object.keys(pkg.devDependencies ?? {})) await rm(`${runtime}/node_modules/${name}`, { recursive: true, force: true })
	console.log('Lab runtime prepared: empty writable cache; no dotenv files or root dev dependencies.')
}
