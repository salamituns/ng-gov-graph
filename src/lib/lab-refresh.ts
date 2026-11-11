import dns from 'node:dns'
import { isIP } from 'node:net'
import { setTimeout as sleep } from 'node:timers/promises'
import { reason } from './refresh-reason'

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
	const purge = env.REFRESH_PURGE?.trim() || 'cloudflare'
	if (purge !== 'cloudflare' && purge !== 'skip') throw new Error('REFRESH_PURGE must be cloudflare or skip')
	const zone = purge === 'cloudflare' ? required('CF_ZONE_ID') : undefined
	const token = purge === 'cloudflare' ? required('CF_API_TOKEN') : undefined
	const port = Number(env.REVALIDATE_PORT ?? '3000')
	if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('REVALIDATE_PORT is invalid')
	const nonNegativeInt = (name: string, fallback: string, max: number) => {
		const value = env[name] ?? fallback
		const parsed = Number(value)
		if (!/^(0|[1-9]\d*)$/.test(value) || !Number.isSafeInteger(parsed) || parsed > max) throw new Error(`${name} is invalid`)
		return parsed
	}
	const timerMax = 2147483647
	const settleMs = nonNegativeInt('REVALIDATE_SETTLE_MS', '10000', timerMax)
	const retries = nonNegativeInt('REVALIDATE_ROUND_RETRIES', '3', 10)
	const retryMs = nonNegativeInt('REVALIDATE_RETRY_MS', '15000', timerMax)
	const api = new URL(env.CF_API_BASE ?? 'https://api.cloudflare.com/client/v4/')
	const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(api.hostname)
	if (api.protocol !== 'https:' && !(api.protocol === 'http:' && loopback)) throw new Error('CF_API_BASE must use HTTPS')
	const fetchImpl = deps.fetch ?? fetch
	const log = deps.log ?? console.log
	const sleeper = deps.sleep ?? sleep
	const resolve4 = deps.resolve4 ?? ((name: string) => dns.promises.resolve4(name))
	await deps.persist()
	log('refresh persisted')
	// The revalidation Service publishes NotReady addresses, so DNS can briefly return a pod
	// that is terminating mid-rollout (connection refused). Each round resolves fresh, and a
	// failed try is retried after re-resolving — a terminating pod leaves DNS within its grace
	// period, so a later try can succeed. Every try still requires every currently resolved
	// pod to acknowledge, so the job never purges with a pod unconfirmed.
	async function revalidate(round: number): Promise<string[]> {
		for (let attempt = 0; ; attempt++) {
			// DNS churn during a rollout (SERVFAIL, ENOTFOUND, no endpoints yet) is retried like a pod failure.
			let ips: string[]
			try {
				ips = [...new Set(await resolve4(host))]
				if (!ips.length || ips.some((ip) => isIP(ip) !== 4)) throw new Error('REVALIDATE_HOST has no valid A records')
			} catch (error) {
				if (attempt >= retries) throw new Error(`round ${round}: ${reason(error)}; purge skipped`)
				log(`round ${round}: resolve failed (${reason(error)}); retrying in ${retryMs} ms`)
				await sleeper(retryMs)
				continue
			}
			const outcomes = await Promise.allSettled(ips.map(async (ip) => {
				const response = await fetchImpl(`http://${ip}:${port}/api/revalidate`, {
					method: 'POST', headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(30000), redirect: 'error',
				})
				if (!response.ok || (await response.json()).ok !== true) throw new Error(`pod revalidation failed (${response.status})`)
			}))
			const failures = outcomes.flatMap((item, index) => (item.status === 'rejected' ? [`${ips[index]}: ${reason(item.reason)}`] : []))
			if (!failures.length) { log(`revalidated ${ips.length} pods (round ${round})`); return ips }
			if (attempt >= retries) throw new Error(`round ${round}: ${failures.length}/${ips.length} pod revalidations failed; purge skipped`)
			log(`round ${round}: ${failures.length}/${ips.length} pod revalidations failed (${failures.join('; ')}); retrying in ${retryMs} ms`)
			await sleeper(retryMs)
		}
	}
	await revalidate(1)
	// Let renders which read the old snapshot finish before expiring their late cache writes.
	log(`settling ${settleMs} ms`)
	await sleeper(settleMs)
	const ips = await revalidate(2)
	if (purge === 'skip') log('purge skipped (REFRESH_PURGE=skip)')
	else if (zone === undefined || token === undefined) throw new Error('Cloudflare purge credentials missing')
	else {
		const base = api.toString().replace(/\/?$/, '/')
		const response = await fetchImpl(new URL(`zones/${encodeURIComponent(zone)}/purge_cache`, base), {
			method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({ purge_everything: true }), signal: AbortSignal.timeout(30000), redirect: 'error',
		})
		if (!response.ok || (await response.json()).success !== true) throw new Error(`Cloudflare purge failed (${response.status})`)
		log('Cloudflare purge accepted')
	}
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
	// Warm-up is best effort: the refresh already succeeded. Failing here would make the
	// Job retry from the start (any restartPolicy, up to backoffLimit) and purge again.
	const failures = warmed.flatMap((item, i) => (item.status === 'rejected' ? [`${ips[i]}: ${reason(item.reason)}`] : []))
	if (failures.length) log(`warning: ${failures.length}/${ips.length} pod warmups failed after purge; refresh succeeded (${failures.join('; ')})`)
	else log(`warmed ${ips.length} pods`)
}
