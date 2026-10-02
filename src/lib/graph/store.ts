import { gunzipSync, gzipSync } from 'node:zlib'
import { eq, inArray } from 'drizzle-orm'
import { unstable_cache } from 'next/cache'
import { getDb } from '@/db'
import { civicFeed, graphSnapshots } from '@/db/schema'

export const NIGERIA_SNAPSHOT_ID = 'ng'
export const NEWS_FEED_ID = 'ng-news'
export const CHANGES_FEED_ID = 'ng-changes'

export async function fetchNeonSnapshot(): Promise<unknown | null> {
	if (!process.env.DATABASE_URL) {
		return null
	}
	try {
		const rows = await getDb()
			.select({ payload: graphSnapshots.payload })
			.from(graphSnapshots)
			.where(eq(graphSnapshots.id, NIGERIA_SNAPSHOT_ID))
			.limit(1)
		return rows[0]?.payload ?? null
	} catch {
		return null
	}
}

export async function fetchCivicFeed(id: string): Promise<unknown | null> {
	if (!process.env.DATABASE_URL) {
		return null
	}
	try {
		const rows = await getDb()
			.select({ payload: civicFeed.payload })
			.from(civicFeed)
			.where(eq(civicFeed.id, id))
			.limit(1)
		return rows[0]?.payload ?? null
	} catch {
		return null
	}
}

/** What every page reads from the database: the graph snapshot and the two feeds. */
export interface StoredData {
	snapshot: unknown | null
	news: unknown | null
	changes: unknown | null
}

const NOTHING_STORED: StoredData = { snapshot: null, news: null, changes: null }

/** Revalidated by the refresh (revalidateTag), so the cache can live for hours. */
export const STORED_DATA_TAG = 'ng-stored-data'

/** Throws on a database error (a quota, an outage), so a failure is never cached as an empty site. */
async function readStoredData(): Promise<StoredData> {
	const db = getDb()
	const [snapshots, feeds] = await Promise.all([
		db.select({ payload: graphSnapshots.payload }).from(graphSnapshots).where(eq(graphSnapshots.id, NIGERIA_SNAPSHOT_ID)).limit(1),
		db.select({ id: civicFeed.id, payload: civicFeed.payload }).from(civicFeed).where(inArray(civicFeed.id, [NEWS_FEED_ID, CHANGES_FEED_ID])),
	])
	const feed = (id: string) => feeds.find((row) => row.id === id)?.payload ?? null
	return { snapshot: snapshots[0]?.payload ?? null, news: feed(NEWS_FEED_ID), changes: feed(CHANGES_FEED_ID) }
}

/**
 * The stored data, read from the database a few times a day instead of on every page view. Each read moves
 * the whole snapshot (over a megabyte), and per-request reads used up the free plan's monthly transfer in
 * two days (October 2026). The cache keeps it gzipped: Next.js skips caching any entry over 2 MB, silently
 * in production, and the snapshot only grows; compressed it is a tenth of that.
 */
const cachedStoredData = unstable_cache(
	async () => gzipSync(JSON.stringify(await readStoredData())).toString('base64'),
	['ng-stored-data-v1'],
	{ tags: [STORED_DATA_TAG], revalidate: 21600 },
)

/** A fresh copy for each request (resolving the graph edits it in place). Empty when the database can't be read. */
export async function loadStoredData(): Promise<StoredData> {
	if (!process.env.DATABASE_URL) return NOTHING_STORED
	try {
		return JSON.parse(gunzipSync(Buffer.from(await cachedStoredData(), 'base64')).toString('utf8')) as StoredData
	} catch {
		return NOTHING_STORED
	}
}

