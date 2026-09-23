import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { compileNigeriaGraph } from './nigeria'

describe('parastatals', () => {
	it('places sourced agencies under the ministry that oversees them', () => {
		const graph = compileNigeriaGraph()
		assert.equal(graph.nodes['ng-firs']?.parentId, 'ng-ministry-of-finance')
		assert.equal(graph.nodes['ng-nafdac']?.parentId, 'ng-ministry-of-health')
		assert.equal(graph.nodes['ng-ncc']?.parentId, 'ng-ministry-of-communications')
		const oversees = Object.values(graph.edges).filter((edge) => edge.type === 'oversees')
		assert.equal(
			oversees.some(
				(edge) => edge.fromId === 'ng-ministry-of-finance' && edge.toId === 'ng-firs',
			),
			true,
		)
		assert.ok(graph.nodes['ng-firs']?.officialUrl?.includes('firs.gov.ng'))
		assert.equal(graph.nodes['ng-fcc-chair'].people[0]?.name, 'Ayo Hulayat Omidiran')
		assert.equal(graph.nodes['ng-office-of-sgf']?.officialUrl, 'https://www.osgf.gov.ng/')
		assert.equal(graph.nodes['ng-office-of-sgf']?.parentId, 'ng-president')
		assert.equal(graph.nodes['ng-osgf'], undefined)
		assert.equal(graph.nodes['ng-nigerian-army']?.parentId, 'ng-armed-forces')
		assert.equal(graph.nodes['ng-frsc']?.parentId, 'ng-office-of-sgf')
		assert.equal(graph.nodes['ng-cac']?.parentId, 'ng-ministry-of-industry')
		assert.equal(graph.nodes['ng-nuprc']?.parentId, 'ng-ministry-of-petroleum')
		assert.equal(
			graph.nodes['ng-minister-of-transportation'].people[0]?.name,
			"Sa'idu Alkali",
		)
		assert.equal(graph.nodes['ng-minister-of-state-labour'].people[0]?.name, 'Nkiruka Onyejeocha')
		assert.equal(
			graph.nodes['ng-minister-of-state-humanitarian-affairs'].people[0]?.name,
			'Yusuf T. Sununu',
		)
		assert.equal(graph.nodes['ng-minister-of-state-finance'].people.length, 0)
		assert.equal(graph.nodes['ng-minister-of-transportation'].people[0]?.acting, undefined)
	})
})
