import { persistNigeriaGraph } from '../src/lib/graph/persist'
import { closeDb } from '../src/db'

export async function persist() {
	if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
	try {
		await persistNigeriaGraph({ liveNass: true, wikiFill: true, portraits: true, monitor: true })
	} finally { await closeDb() }
}
