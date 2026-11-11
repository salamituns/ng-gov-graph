import { revalidateTag } from 'next/cache'
import { STORED_DATA_TAG } from '@/lib/graph/store'

export async function POST(request: Request) {
	const secret = process.env.CRON_SECRET
	if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
		return new Response('unauthorized', { status: 401 })
	}
	revalidateTag(STORED_DATA_TAG, { expire: 0 })
	return Response.json({ ok: true })
}
