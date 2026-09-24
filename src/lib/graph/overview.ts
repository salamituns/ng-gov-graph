import type { CompiledGraph, OverviewCounts, Sector } from './types'

const EMPTY_BRANCH: Record<Sector, number> = {
	legislative: 0,
	executive: 0,
	judicial: 0,
	independent: 0,
}

export function summarizeOverview(graph: CompiledGraph): OverviewCounts {
	const organizations = Object.values(graph.nodes).filter(
		(node) => node.type !== 'constituency' && node.type !== 'dept_head',
	)
	const seats = Object.values(graph.nodes).filter((node) => node.type === 'dept_head')

	const byType: Record<string, number> = {}
	for (const node of organizations) {
		byType[node.type] = (byType[node.type] ?? 0) + 1
	}

	const byBranch = { ...EMPTY_BRANCH }
	for (const node of organizations) {
		if (node.sector) {
			byBranch[node.sector] += 1
		}
	}

	return {
		byType,
		byBranch,
		organizationCount: organizations.length,
		subAgencyCount: graph.satellites.length,
		vacantSeats: seats.filter((seat) => seat.people.length === 0 && !seat.unrecorded).length,
		actingOfficials: seats.filter((seat) => seat.people.some((person) => person.acting)).length,
	}
}
