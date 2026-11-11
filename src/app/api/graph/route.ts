import { loadGraphResource } from '@/lib/graph/resource'
import { renderStart } from '@/lib/render-time'
import { gunzipSync } from 'node:zlib'

// The stored-data tag invalidates this output when the daily refresh succeeds.
export const dynamic = 'force-static'
export const revalidate = 86400

export async function GET() {
	const started = renderStart()
	const { compressed, digest } = await loadGraphResource()
	const body = gunzipSync(Buffer.from(compressed, 'base64')).toString('utf8')
	return new Response(body, {
		headers: {
			'x-govgraph-rendered-at': String(started),
			'Content-Type': 'application/json; charset=utf-8',
			// Legacy, unchecked URLs must never pin current data for a year.
			'Cache-Control': 'public, max-age=60',
			ETag: `"${digest}"`,
		},
	})
}
