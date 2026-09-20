import { integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const graphSnapshots = pgTable('graph_snapshots', {
	id: text('id').primaryKey(),
	compiledAt: timestamp('compiled_at', { withTimezone: true }).notNull(),
	nodeCount: integer('node_count').notNull(),
	edgeCount: integer('edge_count').notNull(),
	payload: jsonb('payload').notNull(),
})

export const civicFeed = pgTable('civic_feed', {
	id: text('id').primaryKey(),
	kind: text('kind').notNull(),
	payload: jsonb('payload').notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
})
