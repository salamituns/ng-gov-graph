import { eq } from 'drizzle-orm'
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
