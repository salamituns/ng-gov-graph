import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

/**
 * Plain Postgres (postgres.js), so any host works: Supabase today (Neon's free transfer ran out in October
 * 2026). On Supabase, DATABASE_URL is the pooler's transaction-mode URL (port 6543), which hands each query
 * a pooled connection and can't keep prepared statements, hence prepare: false. A serverless instance needs
 * only a few connections: pages read through a cache (lib/graph/store), so queries are rare.
 */
function createDb() {
	const url = process.env.DATABASE_URL
	if (!url) {
		throw new Error('DATABASE_URL is not set')
	}
	return drizzle(postgres(url, { prepare: false, max: 3, idle_timeout: 20 }), { schema })
}

let db: ReturnType<typeof createDb> | null = null

export function getDb() {
	if (!db) {
		db = createDb()
	}
	return db
}
