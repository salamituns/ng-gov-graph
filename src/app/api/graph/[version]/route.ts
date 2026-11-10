import { gunzipSync } from 'node:zlib'
import { loadGraphResource } from '@/lib/graph/resource'

// Never store output by attacker-controlled path. The shared data cache remains explicit.
export const revalidate = 0

export async function GET(_request: Request, { params }: { params: Promise<{ version: string }> }) {
	const { version } = await params
	// `$` can match before a trailing newline in JavaScript, so require the exact length too.
	if (version.length !== 16 || !/^[a-f0-9]{16}$/.test(version)) {
		return new Response('Not found\n', {
			status: 404,
			headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=60' },
		})
	}
	// Failures throw: no synthetic fallback can become an immutable response.
	const { compressed, digest, url } = await loadGraphResource()
	if (version !== digest.slice(0, 16)) {
		return new Response(null, { status: 307, headers: { Location: url, 'Cache-Control': 'public, max-age=60' } })
	}
	return new Response(gunzipSync(Buffer.from(compressed, 'base64')).toString('utf8'), {
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
			ETag: `"${digest}"`,
		},
	})
}
