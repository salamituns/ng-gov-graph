import { loadGraphResource } from '@/lib/graph/resource'

// The stored-data tag invalidates this output when the daily refresh succeeds.
export const dynamic = 'force-static'
export const revalidate = false

export async function GET() {
	const { body, digest } = await loadGraphResource()
	return new Response(body, {
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			// New data gives pages a new URL. Older version URLs may safely receive current data.
			'Cache-Control': 'public, max-age=31536000, immutable',
			ETag: `"${digest}"`,
		},
	})
}
