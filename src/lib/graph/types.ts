export type NodeType =
	| 'constituency'
	| 'elected'
	| 'department'
	| 'commission'
	| 'advisory'
	| 'dept_head'
	| 'court'
	| 'corporation'
	| 'state'

export type GraphLayer = 'federal' | 'state'

export type EdgeType =
	| 'appoints'
	| 'confirms'
	| 'elects'
	| 'oversees'
	| 'dept_head'
	| 'advises'
	| 'ex_officio'
	| 'office'
	| 'administers'

export type Sector =
	| 'legislative'
	| 'executive'
	| 'judicial'
	| 'independent'

export interface Officeholder {
	name: string
	appointedYear?: number
	party?: string
	acting?: boolean
	imageUrl?: string
	sourceUrl?: string
	sourceCheckedAt?: string
}

export interface SeatSpec {
	id: string
	title: string
	person: Officeholder | null
	appointedBy?: string
	confirmedBy?: string
	/** The holder is not yet sourced; the seat is not known to be vacant. */
	unrecorded?: boolean
	/** The law the appointment is made under, e.g. "section 154 of the Constitution". */
	basis?: string
}

export interface EntitySpec {
	id: string
	name: string
	type: Exclude<NodeType, 'constituency' | 'dept_head'>
	sector: Sector
	description: string
	legalSourceUrl: string
	officialUrl?: string
	aliases?: string[]
	head?: SeatSpec
	extraSeats?: SeatSpec[]
	parentId?: string
	layer?: GraphLayer
	/** An office whose holder chairs this body ex officio, e.g. the President chairs the Council of State. */
	chairedBy?: string
}

export interface Catalog {
	id: string
	name: string
	constituency: {
		id: string
		name: string
		description: string
	}
	entities: EntitySpec[]
	elects: Array<{ fromId: string; toId: string }>
	oversees: Array<{ fromId: string; toId: string }>
}

export interface GraphNode {
	type: NodeType
	id: string
	name: string
	description: string
	sector?: Sector
	aliases: string[]
	legalSourceUrl?: string
	officialUrl?: string
	head?: string
	people: Officeholder[]
	edges: string[]
	connectedNodes: string[]
	parentId?: string
	layer?: GraphLayer
	/** A seat whose holder is not yet sourced. */
	unrecorded?: boolean
}

export interface GraphEdge {
	id: string
	type: EdgeType
	fromId: string
	toId: string
}

export interface CompiledGraph {
	nodes: Record<string, GraphNode>
	edges: Record<string, GraphEdge>
	constituency: string
	elected: string[]
	departments: string[]
	commissions: string[]
	advisories: string[]
	courts: string[]
	corporations: string[]
	deptHeads: string[]
	satellites: string[]
}

export interface OverviewCounts {
	byType: Record<string, number>
	byBranch: Record<Sector, number>
	organizationCount: number
	subAgencyCount: number
	vacantSeats: number
	actingOfficials: number
}

export interface PersonnelChange {
	kind: 'personnel'
	id: string
	date: string
	personName: string
	positionId: string
	positionName: string
	groupId: string
	entryMode: 'appointed' | 'elected' | 'sworn'
	departure: boolean
	predecessorName: string | null
	sourceUrl?: string
}
