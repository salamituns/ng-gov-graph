import { cp, rm, mkdir, readFile, readdir } from 'node:fs/promises'

if (process.env.LAB_BUILD === '1') {
	const runtime = '.next/standalone'
	await cp('public', `${runtime}/public`, { recursive: true })
	await cp('.next/static', `${runtime}/.next/static`, { recursive: true })
	await cp('cache-handler.cjs', `${runtime}/cache-handler.cjs`)
	for (const file of ['refresh.mjs', 'refresh-persist.mjs']) await cp(`build/${file}`, `${runtime}/${file}`)
	// Next tracing may copy local dotenv files. They are never part of the image/runtime artifact.
	for (const file of await readdir(runtime)) if (file.startsWith('.env')) await rm(`${runtime}/${file}`, { force: true })
	await rm(`${runtime}/.next/cache`, { recursive: true, force: true })
	await mkdir(`${runtime}/.next/cache`, { recursive: true })
	// Runtime uses traced production dependencies only, never the root development toolchain.
	const pkg = JSON.parse(await readFile('package.json', 'utf8'))
	for (const name of Object.keys(pkg.devDependencies ?? {})) await rm(`${runtime}/node_modules/${name}`, { recursive: true, force: true })
	console.log('Lab runtime prepared: empty writable cache; no dotenv files or root dev dependencies.')
}
