import { MINISTRY_BUDGETS } from '@/data/nigeria/budget-2026'
import type { CabinetMember } from './federal-character'
import type { CompiledGraph } from './types'

/** A ministry a minister serves in, with its 2026 budget when the Act gives it a line of its own. */
export interface MinistryMoney {
	id: string
	label: string
	total?: number
}

/** The ministries a cabinet member's seats sit in (a minister of state shares the ministry's budget). */
export function ministriesOf(graph: CompiledGraph, member: CabinetMember): MinistryMoney[] {
	const seen = new Map<string, MinistryMoney>()
	for (const seat of member.seats) {
		const id = seat.parentId ?? seat.id
		if (seen.has(id)) continue
		seen.set(id, { id, label: graph.nodes[id]?.name ?? seat.name, total: MINISTRY_BUDGETS[id]?.total })
	}
	return [...seen.values()]
}

/**
 * What the ministries a group of ministers serve in were given, each ministry counted once: two ministers
 * from one state in the same ministry do not double it. Ministries the Act funds outside a ministry line (the
 * FCT) are named in `uncounted` rather than guessed.
 */
export function ministriesTotal(ministries: MinistryMoney[]) {
	const byId = new Map(ministries.map((ministry) => [ministry.id, ministry]))
	let total = 0
	const uncounted: string[] = []
	for (const ministry of byId.values()) {
		if (ministry.total === undefined) uncounted.push(`the ${ministry.label}`)
		else total += ministry.total
	}
	return { total, count: byId.size, uncounted }
}
