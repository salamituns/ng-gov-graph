import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildGraph } from './build-graph'
import { summarizeOverview } from './overview'
import { searchGraph } from './search'
import type { Catalog } from './types'

const fixture: Catalog = {
	id: 'ng',
	name: 'Federal Republic of Nigeria',
	constituency: {
		id: 'ng-people',
		name: 'People of Nigeria',
		description: 'The sovereign people of the Federal Republic of Nigeria.',
	},
	entities: [
		{
			id: 'ng-president',
			name: 'President of the Federal Republic of Nigeria',
			type: 'elected',
			sector: 'executive',
			description: 'Head of state and head of government.',
			legalSourceUrl: 'https://www.constituteproject.org/constitution/Nigeria_2011#s130',
			aliases: ['President', 'GCFR'],
			head: {
				id: 'ng-office-of-the-president',
				title: 'President',
				person: { name: 'Bola Ahmed Tinubu', appointedYear: 2023, party: 'APC' },
			},
		},
		{
			id: 'ng-national-assembly',
			name: 'National Assembly',
			type: 'elected',
			sector: 'legislative',
			description: 'Bicameral federal legislature.',
			legalSourceUrl: 'https://www.constituteproject.org/constitution/Nigeria_2011#s47',
			aliases: ['NASS'],
		},
		{
			id: 'ng-senate',
			name: 'Senate of Nigeria',
			type: 'elected',
			sector: 'legislative',
			description: 'Red Chamber. Confirms ministerial nominations.',
			legalSourceUrl: 'https://www.constituteproject.org/constitution/Nigeria_2011#s48',
			parentId: 'ng-national-assembly',
			aliases: ['Red Chamber'],
			head: {
				id: 'ng-president-of-the-senate',
				title: 'President of the Senate',
				person: { name: 'Godswill Akpabio', appointedYear: 2023, party: 'APC' },
			},
		},
		{
			id: 'ng-ministry-of-finance',
			name: 'Federal Ministry of Finance',
			type: 'department',
			sector: 'executive',
			description: 'Manages federal public finance.',
			legalSourceUrl: 'https://www.constituteproject.org/constitution/Nigeria_2011#s147',
			officialUrl: 'https://statehouse.gov.ng/the-cabinet/',
			aliases: ['MoF'],
			head: {
				id: 'ng-minister-of-finance',
				title: 'Minister of Finance',
				person: { name: 'Taiwo Oyedele', appointedYear: 2026 },
				appointedBy: 'ng-president',
				confirmedBy: 'ng-senate',
			},
			extraSeats: [
				{
					id: 'ng-minister-of-state-finance',
					title: 'Minister of State for Finance',
					person: null,
					appointedBy: 'ng-president',
					confirmedBy: 'ng-senate',
				},
			],
		},
		{
			id: 'ng-ministry-of-transportation',
			name: 'Federal Ministry of Transportation',
			type: 'department',
			sector: 'executive',
			description: 'Federal transportation policy.',
			legalSourceUrl: 'https://www.constituteproject.org/constitution/Nigeria_2011#s147',
			head: {
				id: 'ng-minister-of-transportation',
				title: 'Minister of Transportation',
				person: null,
				appointedBy: 'ng-president',
				confirmedBy: 'ng-senate',
			},
		},
		{
			id: 'ng-cbn',
			name: 'Central Bank of Nigeria',
			type: 'corporation',
			sector: 'independent',
			description: 'The federal reserve bank.',
			legalSourceUrl: 'https://www.cbn.gov.ng/',
			officialUrl: 'https://www.cbn.gov.ng/',
			aliases: ['CBN'],
			head: {
				id: 'ng-cbn-governor',
				title: 'Governor of the Central Bank of Nigeria',
				person: { name: 'Olayemi Cardoso', appointedYear: 2023 },
				appointedBy: 'ng-president',
				confirmedBy: 'ng-senate',
			},
		},
		{
			id: 'ng-acting-agency',
			name: 'Demo Agency',
			type: 'commission',
			sector: 'independent',
			description: 'Fixture for acting occupancy.',
			legalSourceUrl: 'https://www.constituteproject.org/constitution/Nigeria_2011#s153',
			head: {
				id: 'ng-demo-chair',
				title: 'Chair',
				person: { name: 'Acting Chair', acting: true },
				appointedBy: 'ng-president',
			},
		},
	],
	elects: [
		{ fromId: 'ng-people', toId: 'ng-president' },
		{ fromId: 'ng-senate', toId: 'ng-president-of-the-senate' },
	],
	oversees: [{ fromId: 'ng-president', toId: 'ng-ministry-of-finance' }],
}

describe('buildGraph', () => {
	it('indexes the people as the constituency hub', () => {
		const graph = buildGraph(fixture)
		assert.equal(graph.constituency, 'ng-people')
		assert.equal(graph.nodes['ng-people'].type, 'constituency')
	})

	it('creates a seat node for each head and extra seat', () => {
		const graph = buildGraph(fixture)
		assert.equal(graph.nodes['ng-minister-of-finance'].type, 'dept_head')
		assert.equal(graph.nodes['ng-minister-of-state-finance'].type, 'dept_head')
		assert.equal(graph.nodes['ng-ministry-of-finance'].head, 'ng-minister-of-finance')
	})

	it('wires appoint and confirm edges for ministerial seats', () => {
		const graph = buildGraph(fixture)
		const appoint = Object.values(graph.edges).find(
			(edge) =>
				edge.type === 'appoints' &&
				edge.fromId === 'ng-president' &&
				edge.toId === 'ng-minister-of-finance',
		)
		const confirm = Object.values(graph.edges).find(
			(edge) =>
				edge.type === 'confirms' &&
				edge.fromId === 'ng-senate' &&
				edge.toId === 'ng-minister-of-finance',
		)
		assert.ok(appoint)
		assert.ok(confirm)
	})

	it('links a department to its head with a dept_head edge', () => {
		const graph = buildGraph(fixture)
		const edge = Object.values(graph.edges).find(
			(item) =>
				item.type === 'dept_head' &&
				item.fromId === 'ng-ministry-of-finance' &&
				item.toId === 'ng-minister-of-finance',
		)
		assert.ok(edge)
	})
})

describe('summarizeOverview', () => {
	it('counts vacant seats and acting officials from occupancy', () => {
		const overview = summarizeOverview(buildGraph(fixture))
		assert.equal(overview.vacantSeats, 2)
		assert.equal(overview.actingOfficials, 1)
		assert.ok(overview.byBranch.executive >= 2)
		assert.ok(overview.organizationCount >= 4)
	})
})

describe('searchGraph', () => {
	it('matches official names and aliases', () => {
		const graph = buildGraph(fixture)
		const cbn = searchGraph(graph, 'CBN')
		assert.ok(cbn.some((hit) => hit.id === 'ng-cbn'))
		const president = searchGraph(graph, 'tinubu')
		assert.ok(president.some((hit) => hit.id === 'ng-president' || hit.id === 'ng-office-of-the-president'))
	})

	it('returns nothing for empty queries', () => {
		assert.deepEqual(searchGraph(buildGraph(fixture), '   '), [])
	})
})
