import type { CompiledGraph, Officeholder } from './types'

export type ChamberKind = 'senate' | 'house'

export interface RosterSeat {
	id: string
	name: string
	stateId: string
	stateName: string
	person: Officeholder | null
}

export interface ChamberRoster {
	kind: ChamberKind
	seats: RosterSeat[]
}

const CHAMBERS: Record<string, { kind: ChamberKind; prefix: string }> = {
	'ng-senate': { kind: 'senate', prefix: 'ng-senator-' },
	'ng-house-of-representatives': { kind: 'house', prefix: 'ng-rep-' },
}

export function chamberRoster(
	graph: CompiledGraph,
	chamberId: string,
): ChamberRoster | null {
	const chamber = CHAMBERS[chamberId]
	if (!chamber) {
		return null
	}
	const seats = Object.values(graph.nodes)
		.filter((node) => node.id.startsWith(chamber.prefix))
		.map((node) => {
			const elect = Object.values(graph.edges).find(
				(edge) => edge.type === 'elects' && edge.toId === node.id,
			)
			const state = elect ? graph.nodes[elect.fromId] : undefined
			return {
				id: node.id,
				name: node.name,
				stateId: state?.id ?? 'unknown',
				stateName: state?.name ?? 'Unknown',
				person: node.people[0] ?? null,
			}
		})
		.sort(
			(left, right) =>
				left.stateName.localeCompare(right.stateName) ||
				left.name.localeCompare(right.name),
		)
	return { kind: chamber.kind, seats }
}
