import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { compileNigeriaGraph } from './nigeria'
import { searchGraph } from './search'

const graph = compileNigeriaGraph()
const top = (query: string, count = 3) => searchGraph(graph, query).slice(0, count).map((node) => node.id)

describe('graph search', () => {
	it('puts a ministry first when its subject is searched, ahead of agencies that mention it', () => {
		assert.equal(top('Education')[0], 'ng-ministry-of-education')
		assert.equal(top('defence')[0], 'ng-ministry-of-defence')
	})

	it('treats an exact abbreviation as the name', () => {
		const inec = searchGraph(graph, 'INEC')[0]
		assert.match(inec.name, /Independent National Electoral Commission/)
	})

	it('finds people by name', () => {
		const hits = searchGraph(graph, 'Tinubu')
		assert.ok(hits.some((node) => node.id === 'ng-president'))
	})

	it('ranks name matches above description-only matches', () => {
		const hits = searchGraph(graph, 'Education')
		const firstDescriptionOnly = hits.findIndex((node) => !node.name.toLowerCase().includes('educat'))
		const lastNameMatch = hits.map((node) => node.name.toLowerCase().includes('education')).lastIndexOf(true)
		assert.ok(firstDescriptionOnly === -1 || firstDescriptionOnly > lastNameMatch)
	})

	it('returns nothing for an empty query', () => {
		assert.deepEqual(searchGraph(graph, '   '), [])
	})
})
