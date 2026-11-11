import dns from 'node:dns'
import { isIP } from 'node:net'

interface Dependencies {
	persist: () => Promise<unknown>
	resolve4?: (host: string) => Promise<string[]>
	fetch?: typeof fetch
	log?: (message: string) => void
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
	const api = new URL(env.CF_API_BASE ?? 'https://api.cloudflare.com/client/v4/')
	const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(api.hostname)
	if (api.protocol !== 'https:' && !(api.protocol === 'http:' && loopback)) throw new Error('CF_API_BASE must use HTTPS')
	const fetchImpl = deps.fetch ?? fetch
	const log = deps.log ?? console.log
	await deps.persist()
	log('refresh persisted')
	const ips = [...new Set(await (deps.resolve4 ?? ((name) => dns.promises.resolve4(name)))(host))]
	if (!ips.length || ips.some((ip) => isIP(ip) !== 4)) throw new Error('REVALIDATE_HOST has no valid A records')
	const outcomes = await Promise.allSettled(ips.map(async (ip) => {
		const response = await fetchImpl(`http://${ip}:${port}/api/revalidate`, {
			method: 'POST', headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(30000), redirect: 'error',
		})
		if (!response.ok || (await response.json()).ok !== true) throw new Error(`pod revalidation failed (${response.status})`)
	}))
	const failed = outcomes.filter((item) => item.status === 'rejected').length
	if (failed) throw new Error(`${failed}/${ips.length} pod revalidations failed; purge skipped`)
	log(`revalidated ${ips.length} pods`)
	const base = api.toString().replace(/\/?$/, '/')
	const response = await fetchImpl(new URL(`zones/${encodeURIComponent(zone)}/purge_cache`, base), {
		method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({ purge_everything: true }), signal: AbortSignal.timeout(30000), redirect: 'error',
	})
	if (!response.ok || (await response.json()).success !== true) throw new Error(`Cloudflare purge failed (${response.status})`)
	log('Cloudflare purge accepted')
}
