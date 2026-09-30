import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { PROVISIONS } from '@/data/nigeria/constitution'
import { constitutionalBasis, provisionsFor } from './constitution'
import { compileNigeriaGraph } from './nigeria'

const graph = compileNigeriaGraph()
const basis = (fromId: string, toId: string, type: string) => constitutionalBasis(graph, { fromId, toId, type })

describe('constitution layer', () => {
	it('cites s.147 for a minister, whether the link points at the ministry or the seat', () => {
		assert.equal(basis('ng-president', 'ng-minister-of-defence', 'appoints'), PROVISIONS.ministers)
		assert.equal(basis('ng-senate', 'ng-ministry-of-defence', 'confirms'), PROVISIONS.ministers)
		assert.equal(basis('ng-president', 'ng-attorney-general', 'appoints'), PROVISIONS.attorneyGeneral)
	})

	it('cites the court sections for the heads of the superior courts', () => {
		assert.equal(basis('ng-president', 'ng-chief-justice', 'appoints'), PROVISIONS.chiefJustice)
		assert.equal(basis('ng-senate', 'ng-chief-justice', 'confirms'), PROVISIONS.chiefJustice)
		assert.equal(basis('ng-president', 'ng-president-court-of-appeal', 'appoints'), PROVISIONS.courtOfAppeal)
	})

	it('cites s.153–154 for INEC but nothing for statutory bodies like the EFCC and CBN', () => {
		assert.equal(basis('ng-president', 'ng-inec-chairman', 'appoints'), PROVISIONS.federalBodies)
		assert.equal(basis('ng-president', 'ng-efcc-chairman', 'appoints'), undefined)
		assert.equal(basis('ng-senate', 'ng-cbn-governor', 'confirms'), undefined)
		assert.equal(basis('ng-ministry-of-health', 'ng-nafdac', 'oversees'), undefined)
	})

	it('does not claim the Constitution requires Senate confirmation where it does not', () => {
		assert.equal(basis('ng-senate', 'ng-inspector-general-of-police', 'confirms'), undefined)
		assert.equal(basis('ng-president', 'ng-inspector-general-of-police', 'appoints'), PROVISIONS.inspectorGeneral)
	})

	it('explains how every member of the National Assembly is elected', () => {
		const incoming = Object.values(graph.edges).filter((edge) => edge.type === 'elects' && graph.nodes[edge.fromId]?.type === 'state')
		assert.ok(incoming.length > 400)
		for (const edge of incoming) assert.ok(constitutionalBasis(graph, edge), `${edge.fromId} elects ${edge.toId}`)
	})

	it('gives every elected office and every s.153 body a provision on its page', () => {
		for (const id of ['ng-president', 'ng-vice-president', 'ng-senate', 'ng-inec', 'ng-njc', 'ng-council-of-state', 'ng-ministry-of-finance']) {
			assert.ok(provisionsFor(graph, id).length, id)
		}
		assert.deepEqual(provisionsFor(graph, 'ng-ministry-of-finance').slice(0, 1), [PROVISIONS.ministers])
	})
})
