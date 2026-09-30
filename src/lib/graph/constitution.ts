import {
	PRESIDENTIAL_COUNCILS,
	PROVISIONS,
	SECTION_153_BODIES,
	type Provision,
	type ProvisionKey,
} from '@/data/nigeria/constitution'
import { isCabinetSeat } from './cabinet'
import type { CompiledGraph, GraphNode } from './types'

export interface LinkRef {
	fromId: string
	toId: string
	type: string
}

const COURT_HEADS: Record<string, ProvisionKey> = {
	'ng-supreme-court': 'chiefJustice',
	'ng-court-of-appeal': 'courtOfAppeal',
	'ng-federal-high-court': 'federalHighCourt',
	'ng-code-of-conduct-tribunal': 'codeOfConductTribunal',
}

const APPOINTED_OFFICES: Record<string, ProvisionKey> = {
	'ng-office-of-sgf': 'secretaryToGovernment',
	'ng-ohcsf': 'headOfService',
	'ng-office-of-the-auditor-general': 'auditorGeneral',
	'ng-police': 'inspectorGeneral',
	'ng-armed-forces': 'armedForces',
	'ng-nigerian-army': 'armedForces',
	'ng-nigerian-navy': 'armedForces',
	'ng-nigerian-air-force': 'armedForces',
}

/** Rules that need a Senate vote; the others are the President's alone. */
const SENATE_CONFIRMS = new Set<ProvisionKey>(['ministers', 'attorneyGeneral', 'federalBodies', 'chiefJustice', 'courtOfAppeal', 'federalHighCourt', 'auditorGeneral'])

/** A link may point at a seat or at the body the seat heads; rules read both. */
function target(graph: CompiledGraph, id: string): { org?: GraphNode; seat?: GraphNode } {
	const node = graph.nodes[id]
	if (!node) return {}
	if (node.type === 'dept_head') return { org: node.parentId ? graph.nodes[node.parentId] : undefined, seat: node }
	return { org: node, seat: node.head ? graph.nodes[node.head] : undefined }
}

function ministerial(org?: GraphNode, seat?: GraphNode): ProvisionKey | undefined {
	if (seat?.id === 'ng-attorney-general' || org?.id === 'ng-ministry-of-justice') return 'attorneyGeneral'
	if ((seat && isCabinetSeat(seat)) || seat?.id === 'ng-fct-minister-seat') return 'ministers'
	if (org?.id.startsWith('ng-ministry-of-')) return 'ministers'
	return undefined
}

function appointment(org?: GraphNode, seat?: GraphNode): ProvisionKey | undefined {
	if (!org) return undefined
	return ministerial(org, seat) ?? COURT_HEADS[org.id] ?? (SECTION_153_BODIES.has(org.id) ? 'federalBodies' : APPOINTED_OFFICES[org.id])
}

function rule(graph: CompiledGraph, link: LinkRef): ProvisionKey | undefined {
	const from = graph.nodes[link.fromId]
	const { org, seat } = target(graph, link.toId)
	if (!from || !org) return undefined
	switch (link.type) {
		case 'elects':
			if (from.id === 'ng-people') {
				if (org.id === 'ng-president') return 'electPresident'
				if (org.id === 'ng-vice-president') return 'electVicePresident'
				if (org.id === 'ng-national-assembly') return 'electNationalAssembly'
				if (seat?.id.startsWith('ng-governor-of-') || org.type === 'state') return 'electGovernor'
				if (org.id.endsWith('-house-of-assembly')) return 'stateAssembly'
				return undefined
			}
			if (from.type === 'state') {
				const id = seat?.id ?? link.toId
				if (id.startsWith('ng-senator-')) return 'electSenator'
				if (id.startsWith('ng-rep-')) return 'electRepresentative'
				return undefined
			}
			if (from.id === 'ng-senate' || from.id === 'ng-house-of-representatives') return 'electPresidingOfficers'
			return undefined
		case 'appoints': {
			if (from.id !== 'ng-president') return undefined
			return appointment(org, seat)
		}
		case 'confirms': {
			if (from.id !== 'ng-senate') return undefined
			const key = appointment(org, seat)
			return key && SENATE_CONFIRMS.has(key) ? key : undefined
		}
		case 'ex_officio':
			if (from.id === 'ng-president' && PRESIDENTIAL_COUNCILS.has(org.id)) return 'councilChair'
			if (from.id === 'ng-vice-president' && org.id === 'ng-national-economic-council') return 'economicCouncil'
			if (from.id === 'ng-supreme-court' && (org.id === 'ng-njc' || org.id === 'ng-fjsc')) return 'judicialCouncils'
			return undefined
		case 'oversees':
			if (from.id === 'ng-national-assembly') return 'electNationalAssembly'
			if (from.id === 'ng-njc') return 'njc'
			if (from.id === 'ng-supreme-court' && org.id === 'ng-court-of-appeal') return 'appeals'
			if (from.id === 'ng-ministry-of-fct' && org.id === 'ng-fct') return 'fct'
			if (from.id === 'ng-armed-forces') return 'armedForces'
			if (from.type === 'state' && org.id.endsWith('-house-of-assembly')) return 'stateAssembly'
			if (from.id === 'ng-president') return 'executivePower'
			return undefined
		default:
			return undefined
	}
}

/**
 * The section of the Constitution that sets up a link on the map, or nothing when the link rests
 * on an Act of the National Assembly rather than the Constitution.
 */
export function constitutionalBasis(graph: CompiledGraph, link: LinkRef): Provision | undefined {
	const key = rule(graph, link)
	return key ? PROVISIONS[key] : undefined
}

/**
 * Every provision behind an entity's own links, in reading order: how it is filled first, then
 * what it controls. A ministry and its minister's seat share the same provisions.
 */
export function provisionsFor(graph: CompiledGraph, id: string): Provision[] {
	const node = graph.nodes[id]
	if (!node) return []
	const orgId = node.type === 'dept_head' && node.parentId ? node.parentId : id
	const ids = new Set([orgId, graph.nodes[orgId]?.head].filter((value): value is string => Boolean(value)))
	const order = ['elects', 'appoints', 'confirms', 'ex_officio', 'oversees']
	const edges = Object.values(graph.edges)
		.filter((edge) => ids.has(edge.toId) || (ids.has(edge.fromId) && edge.type !== 'oversees'))
		.sort((a, b) => Number(ids.has(b.toId)) - Number(ids.has(a.toId)) || order.indexOf(a.type) - order.indexOf(b.type))
	const out: Provision[] = []
	for (const edge of edges) {
		const provision = constitutionalBasis(graph, edge)
		if (provision && !out.includes(provision)) out.push(provision)
	}
	return out
}
