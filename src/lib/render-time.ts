import { workAsyncStorage } from 'next/dist/server/app-render/work-async-storage.external'

/** Pinned Next 16.4.6 request start, before a render can read the stored snapshot. */
export function renderStart() {
	return workAsyncStorage.getStore()?.requestStartTime ?? Date.now()
}
