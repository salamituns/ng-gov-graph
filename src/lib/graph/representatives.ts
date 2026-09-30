import { chamberRoster, type RosterSeat } from './roster'
import type { CompiledGraph, GraphNode, Officeholder } from './types'

export interface Representatives {
	state: GraphNode
	/** The state's chief executive: an elected governor, or for the FCT an appointed minister. */
	leader: { seat?: GraphNode; person: Officeholder | null; elected: boolean }
	assembly?: GraphNode
	senators: RosterSeat[]
	representatives: RosterSeat[]
}

/** Everyone a resident of one state votes for, or who governs them there. */
export function representativesFor(graph: CompiledGraph, stateId: string): Representatives | null {
	const state = graph.nodes[stateId]
	if (!state || state.type !== 'state') return null
	const seat = state.head ? graph.nodes[state.head] : undefined
	const elected = Object.values(graph.edges).some((edge) => edge.type === 'elects' && edge.toId === state.head)
	const assembly = Object.values(graph.nodes).find((node) => node.parentId === state.id && node.type === 'elected')
	const inState = (roster: ReturnType<typeof chamberRoster>) => roster?.seats.filter((item) => item.stateId === state.id) ?? []
	return {
		state,
		leader: { seat, person: seat?.people[0] ?? state.people[0] ?? null, elected },
		assembly,
		senators: inState(chamberRoster(graph, 'ng-senate')),
		representatives: inState(chamberRoster(graph, 'ng-house-of-representatives')),
	}
}
