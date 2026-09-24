import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { compileNigeriaGraph, resolveNigeriaGraph } from './nigeria'
import { retagNews } from './feed'
import { mentionLabels } from './mentions'
import { powerPeople } from './power'

describe('snapshot back-fill', () => {
	it('restores missing organizations but not seats the snapshot dropped on purpose', async () => {
		const catalog = compileNigeriaGraph()
		const seat = Object.values(catalog.nodes).find((node) => node.id.includes('-unlisted-'))
		assert.ok(seat)
		const snapshot = structuredClone(catalog)
		delete snapshot.nodes[seat.id]
		delete snapshot.nodes['ng-fjsc']
		const { graph } = await resolveNigeriaGraph(async () => snapshot)
		assert.equal(graph.nodes[seat.id], undefined)
		assert.ok(graph.nodes['ng-fjsc'])
	})
})

describe('power map', () => {
	it('counts a person once per article and credits their primary office', () => {
		const graph = compileNigeriaGraph()
		const news = [{
			id: 'n', url: 'https://statehouse.gov.ng/x', publication: 'State House', publishedAt: '2026-09-20',
			summary: 'Gas deal', entityIds: ['ng-president', 'ng-ministry-of-petroleum'],
		}]
		const { people } = powerPeople(graph, news, 90, new Date('2026-09-24T00:00:00Z'))
		const tinubu = people.find((person) => person.name === graph.nodes['ng-president'].people[0].name)
		assert.equal(tinubu?.total, 1)
		assert.equal(tinubu?.nodeId, 'ng-president')
	})
})

describe('inline tagged news', () => {
	it('takes entity ids from gov_entities tags', () => {
		const graph = compileNigeriaGraph()
		const [item] = retagNews([{
			id: 'n', url: 'https://example.com', publication: 'Test',
			summary: "<gov_entities='ng-ministry-of-finance'>Taiwo Oyedele</gov_entities> became minister.",
		}], mentionLabels(graph))
		assert.deepEqual(item.entityIds, ['ng-ministry-of-finance'])
	})
})

describe('head seat back-fill', () => {
	it('adds a new unrecorded head seat to a body the snapshot already has, with its appointment link', async () => {
		const catalog = compileNigeriaGraph()
		const snapshot = structuredClone(catalog)
		delete snapshot.nodes['ng-firs-head']
		for (const [id, edge] of Object.entries(snapshot.edges)) if (edge.toId === 'ng-firs-head' || edge.fromId === 'ng-firs-head') delete snapshot.edges[id]
		snapshot.nodes['ng-firs'] = { ...snapshot.nodes['ng-firs'], head: undefined }
		const { graph } = await resolveNigeriaGraph(async () => snapshot)
		assert.equal(graph.nodes['ng-firs'].head, 'ng-firs-head')
		assert.ok(Object.values(graph.edges).some((edge) => edge.type === 'appoints' && edge.toId === 'ng-firs-head'))
	})
})
