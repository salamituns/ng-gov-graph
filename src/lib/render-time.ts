import { workAsyncStorage } from 'next/dist/server/app-render/work-async-storage.external'

/** Pinned Next 16.4.6 request start, before a render can read the stored snapshot. */
export function renderStart() {
	const store = workAsyncStorage.getStore()
	if (!store) throw new Error('Render time requires a Next request context')
	return store.requestStartTime
}
