import { MINISTER_ORIGINS, type MinisterOrigin } from '@/data/nigeria/origins'
import { STATE_ZONES, ZONE_ORDER, type GeopoliticalZone } from '@/data/nigeria/states'
import type { CompiledGraph, GraphNode, Officeholder } from './types'

export interface CabinetMember {
	person: Officeholder
	/** Every cabinet seat this person holds; the first is the senior one. */
	seats: GraphNode[]
	origin?: MinisterOrigin
	zone?: GeopoliticalZone
}

export interface StateTally {
	state: GraphNode
	zone: GeopoliticalZone
	members: CabinetMember[]
}

export interface FederalCharacter {
	members: CabinetMember[]
	states: StateTally[]
	zones: { zone: GeopoliticalZone; members: CabinetMember[]; states: number }[]
	/** States with no minister in our records: a possible gap under section 147(3). */
	uncovered: GraphNode[]
	/** Ministers whose state we have not yet sourced. */
	unsourced: CabinetMember[]
}

/** Cabinet seats: every minister and minister of state, and the Attorney-General. */
export function isCabinetSeat(node: GraphNode) {
	return node.type === 'dept_head' && (node.id.startsWith('ng-minister-of-') || node.id === 'ng-attorney-general')
}

/** Substantive ministers sort before ministers of state. */
function seniority(node: GraphNode) {
	return node.id.startsWith('ng-minister-of-state-') ? 1 : 0
}

export function federalCharacter(graph: CompiledGraph): FederalCharacter {
	// The President also holds the Petroleum portfolio; he is not a minister nominated from a state.
	const president = new Set(graph.nodes['ng-president']?.people.map((person) => person.name))
	const byPerson = new Map<string, CabinetMember>()
	const seats = Object.values(graph.nodes)
		.filter(isCabinetSeat)
		.sort((a, b) => seniority(a) - seniority(b) || a.name.localeCompare(b.name))
	for (const seat of seats) {
		for (const person of seat.people) {
			if (!person.name || president.has(person.name)) continue
			const known = byPerson.get(person.name)
			if (known) {
				known.seats.push(seat)
				continue
			}
			const origin = MINISTER_ORIGINS[person.name]
			byPerson.set(person.name, { person, seats: [seat], origin, zone: origin ? STATE_ZONES[origin.stateId] : undefined })
		}
	}
	const members = [...byPerson.values()]

	const stateNodes = Object.values(graph.nodes).filter((node) => node.type === 'state')
	const states: StateTally[] = stateNodes
		.map((state) => ({
			state,
			zone: STATE_ZONES[state.id] ?? 'North Central',
			members: members.filter((member) => member.origin?.stateId === state.id),
		}))
		.sort((a, b) => ZONE_ORDER.indexOf(a.zone) - ZONE_ORDER.indexOf(b.zone) || a.state.name.localeCompare(b.state.name))

	const zones = ZONE_ORDER.map((zone) => ({
		zone,
		members: members.filter((member) => member.zone === zone),
		states: states.filter((tally) => tally.zone === zone).length,
	}))

	return {
		members,
		states,
		zones,
		uncovered: states.filter((tally) => tally.members.length === 0).map((tally) => tally.state),
		unsourced: members.filter((member) => !member.origin),
	}
}
