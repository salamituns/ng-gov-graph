import dns from 'node:dns'
import { isIP } from 'node:net'
import { setTimeout as sleep } from 'node:timers/promises'

interface Dependencies {
	persist: () => Promise<unknown>
	resolve4?: (host: string) => Promise<string[]>
	fetch?: typeof fetch
	log?: (message: string) => void
	sleep?: (ms: number) => Promise<unknown>
}

/** No purge is permitted until persistence and every pod acknowledgement have succeeded. */
export async function runRefresh(env: Record<string, string | undefined>, deps: Dependencies) {
	const required = (name: string) => {
		const value = env[name]?.trim()
		if (!value) throw new Error(`${name} is required`)
		return value
	}
	const host = required('REVALIDATE_HOST')
	const secret = required('CRON_SECRET')
	const zone = required('CF_ZONE_ID')
	const token = required('CF_API_TOKEN')
	const port = Number(env.REVALIDATE_PORT ?? '3000')
	if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('REVALIDATE_PORT is invalid')
	const settleValue = env.REVALIDATE_SETTLE_MS ?? '10000'
	const settleMs = Number(settleValue)
	if (!/^(0|[1-9]\d*)$/.test(settleValue) || !Number.isSafeInteger(settleMs) || settleMs > 2147483647) throw new Error('REVALIDATE_SETTLE_MS is invalid')
	const api = new URL(env.CF_API_BASE ?? 'https://api.cloudflare.com/client/v4/')
	const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(api.hostname)
	if (api.protocol !== 'https:' && !(api.protocol === 'http:' && loopback)) throw new Error('CF_API_BASE must use HTTPS')
	const fetchImpl = deps.fetch ?? fetch
	const log = deps.log ?? console.log
	await deps.persist()
	log('refresh persisted')
	const ips = [...new Set(await (deps.resolve4 ?? ((name) => dns.promises.resolve4(name)))(host))]
	if (!ips.length || ips.some((ip) => isIP(ip) !== 4)) throw new Error('REVALIDATE_HOST has no valid A records')
	async function revalidate(round: number) {
		const outcomes = await Promise.allSettled(ips.map(async (ip) => {
			const response = await fetchImpl(`http://${ip}:${port}/api/revalidate`, {
				method: 'POST', headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(30000), redirect: 'error',
			})
			if (!response.ok || (await response.json()).ok !== true) throw new Error(`pod revalidation failed (${response.status})`)
		}))
		const failed = outcomes.filter((item) => item.status === 'rejected').length
		if (failed) throw new Error(`round ${round}: ${failed}/${ips.length} pod revalidations failed; purge skipped`)
		log(`revalidated ${ips.length} pods (round ${round})`)
	}
	await revalidate(1)
	// Let renders which read the old snapshot finish before expiring their late cache writes.
	log(`settling ${settleMs} ms`)
	await (deps.sleep ?? sleep)(settleMs)
	await revalidate(2)
	const base = api.toString().replace(/\/?$/, '/')
	const response = await fetchImpl(new URL(`zones/${encodeURIComponent(zone)}/purge_cache`, base), {
		method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({ purge_everything: true }), signal: AbortSignal.timeout(30000), redirect: 'error',
	})
	if (!response.ok || (await response.json()).success !== true) throw new Error(`Cloudflare purge failed (${response.status})`)
	log('Cloudflare purge accepted')
	const warmed = await Promise.allSettled(ips.map(async (ip) => {
		const origin = `http://${ip}:${port}`
		const home = await fetchImpl(`${origin}/ng`, { signal: AbortSignal.timeout(30000), redirect: 'error' })
		if (!home.ok) throw new Error(`homepage warmup failed (${home.status})`)
		const graphPath = (await home.text()).match(/\/api\/graph\/[a-f0-9]{16}(?![a-f0-9])/)?.[0]
		if (!graphPath) throw new Error('homepage warmup has no versioned graph URL')
		const graph = await fetchImpl(origin + graphPath, { signal: AbortSignal.timeout(30000), redirect: 'error' })
		if (!graph.ok) throw new Error(`graph warmup failed (${graph.status})`)
		await graph.arrayBuffer()
	}))
	const failedWarmups = warmed.filter((item) => item.status === 'rejected').length
	if (failedWarmups) throw new Error(`${failedWarmups}/${ips.length} pod warmups failed after purge`)
	log(`warmed ${ips.length} pods`)
}
