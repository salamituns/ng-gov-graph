import { gunzipSync } from 'node:zlib'
import { loadGraphResource } from '@/lib/graph/resource'

export const dynamic = 'force-static'
export const revalidate = 86400
export function generateStaticParams() { return [] }

export async function GET(_request: Request, { params }: { params: Promise<{ version: string }> }) {
	// Failures throw: no synthetic fallback can become an immutable response.
	const [{ version }, { compressed, digest }] = await Promise.all([params, loadGraphResource()])
	return new Response(gunzipSync(Buffer.from(compressed, 'base64')).toString('utf8'), {
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': version === digest.slice(0, 16)
				? 'public, max-age=31536000, immutable'
				: 'public, max-age=60',
			ETag: `"${digest}"`,
		},
	})
}
