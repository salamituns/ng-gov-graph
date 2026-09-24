import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { authorityChain, descendantsOf } from './authority'
import { compileNigeriaGraph } from './nigeria'
import { filterGraph } from './filter'

const graph = filterGraph(compileNigeriaGraph(), 'federal')
const has = (links: ReturnType<typeof authorityChain>, fromId: string, toId: string, type: string) =>
	links.some((link) => link.fromId === fromId && link.toId === toId && link.type === type)

describe('authority chain', () => {
	it('traces a ministry back to the People through appointment and confirmation', () => {
		const links = authorityChain(graph, 'ng-ministry-of-interior')
		assert.ok(has(links, 'ng-president', 'ng-ministry-of-interior', 'appoints'))
		assert.ok(has(links, 'ng-senate', 'ng-ministry-of-interior', 'confirms'))
		assert.ok(has(links, 'ng-people', 'ng-president', 'elects'))
		assert.ok(has(links, 'ng-national-assembly', 'ng-senate', 'oversees'))
		assert.ok(has(links, 'ng-people', 'ng-national-assembly', 'elects'))
	})

	it('reaches a sub-agency through the ministry that oversees it', () => {
		const links = authorityChain(graph, 'ng-nis')
		assert.ok(has(links, 'ng-ministry-of-interior', 'ng-nis', 'oversees'))
		assert.ok(has(links, 'ng-president', 'ng-ministry-of-interior', 'appoints'))
	})

	it('never links a chamber to itself for electing its own presiding officer', () => {
		const links = authorityChain(graph, 'ng-senate')
		assert.equal(links.some((link) => link.fromId === link.toId), false)
	})

	it('lists nested sub-agencies', () => {
		const below = descendantsOf(graph, 'ng-ministry-of-defence')
		assert.ok(below.includes('ng-armed-forces'))
		assert.ok(below.includes('ng-nigerian-navy'))
	})
})
