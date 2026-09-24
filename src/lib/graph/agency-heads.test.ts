import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { overlayAgencyHeads, parseInfoboxHead } from './agency-heads'
import { compileNigeriaGraph } from './nigeria'

const INFOBOX = `{{Infobox government agency
| agency_name = Nigerian Ports Authority
| jurisdiction = [[Nigeria]]
| chief1_name = [[Jane Doe|Dr. Jane Doe]]
| chief1_position = Chairman
| chief2_name = John Roe
| chief2_position = Managing Director
}}`

describe('agency heads from Wikipedia', () => {
	it('picks the chief whose position matches the seat', () => {
		assert.equal(parseInfoboxHead(INFOBOX, 'Managing Director'), 'John Roe')
		assert.equal(parseInfoboxHead(INFOBOX, 'Chairman of the Board'), 'Jane Doe')
		assert.equal(parseInfoboxHead('| chief1_name = Vacant', 'Director-General'), null)
	})

	it('fills only unrecorded seats and ignores pages not about Nigeria', async () => {
		const graph = compileNigeriaGraph()
		for (const id of ['ng-npa', 'ng-sec']) {
			graph.nodes[`${id}-head`].people = []
			graph.nodes[`${id}-head`].unrecorded = true
			graph.nodes[id].people = []
		}
		const pages: Record<string, string> = {
			'Nigerian Ports Authority': INFOBOX,
			'Securities and Exchange Commission': '{{Infobox| jurisdiction = United States | chief1_name = Paul Atkins | chief1_position = Chairman}}',
		}
		await overlayAgencyHeads(graph, async (title) => pages[title] ?? '')
		assert.equal(graph.nodes['ng-npa-head'].people[0]?.name, 'John Roe')
		assert.equal(graph.nodes['ng-npa-head'].unrecorded, undefined)
		assert.equal(graph.nodes['ng-sec-head'].people.length, 0)
		assert.ok(graph.nodes['ng-minister-of-finance'].people.length)
	})
})
