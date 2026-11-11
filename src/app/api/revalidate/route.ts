import { revalidateTag } from 'next/cache'
import { workAsyncStorage } from 'next/dist/server/app-render/work-async-storage.external'
import { executeRevalidates } from 'next/dist/server/revalidation-utils'
import { reason } from '@/lib/refresh-reason'
import { STORED_DATA_TAG } from '@/lib/graph/store'

export async function POST(request: Request) {
	const secret = process.env.CRON_SECRET
	if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
		return new Response('unauthorized', { status: 401 })
	}
	try {
		revalidateTag(STORED_DATA_TAG, { expire: 0 })
		// Next normally defers this to waitUntil. The job needs completed invalidation before its acknowledgement.
		const store = workAsyncStorage.getStore()
		if (!store) throw new Error('Missing revalidation request context')
		await executeRevalidates(store)
		store.pendingRevalidatedTags = []
		return Response.json({ ok: true })
	} catch (error) {
		const store = workAsyncStorage.getStore()
		if (store) store.pendingRevalidatedTags = []
		console.error(`revalidation failed: ${reason(error)}`)
		return Response.json({ ok: false }, { status: 503 })
	}
}
