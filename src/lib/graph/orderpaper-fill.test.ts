import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { compileNigeriaGraph } from './nigeria'
import { applyVacantOccupancy } from './wiki-fill'
import { parseOrderpaperMembers } from './orderpaper-fill'

const ORDERPAPER = `
Peoples Democratic Party

### [Hon Murtar Muhammad](https://orderpaper.ng/voter/10th-national-assembly-member?id=Murtar-Muhammad-2328)

Kazaure/Roni /Gwiwa/Yankwashi Constituency, Jigawa

![](https://orderpaper.ng/voter/uploads/candidate6081712780164.jpg)

Peoples Democratic Party

### [Sen Musa Garba Maidoki](https://orderpaper.ng/voter/10th-national-assembly-member?id=Musa-Garba-Maidoki-608)

Kebbi South District, Kebbi

![](https://orderpaper.ng/voter/uploads/candidate6081712780164.jpg)

All Progressives Congress

### [Sen Musa Mustapha](https://orderpaper.ng/voter/10th-national-assembly-member?id=Musa-Mustapha-4060)

Yobe East District, Yobe
`

const ORDERPAPER_PROFILE = `
<h3 style="margin-bottom: 30px">Sen Musa Garba Maidoki</h3>
<p><strong>District:</strong> Kebbi South District, Kebbi</p>
<p><strong>Party:</strong> Peoples Democratic Party</p>
`

const ORDERPAPER_HOUSE_PROFILE = `
<h3>Hon Gwacham Maureen Chinwe</h3>
<p><strong>Constituency:</strong> Oyi/Ayamelum Constituency, Anambra</p>
<p><strong>Party:</strong> All Progressive Grand Alliance</p>
`

describe('orderpaper occupancy fill', () => {
	it('parses Senate districts including Kebbi South', () => {
		const rows = parseOrderpaperMembers(ORDERPAPER)
		const maidoki = rows.find((row) => row.id === 'ng-senator-kebbi-south')
		assert.deepEqual(maidoki, {
			id: 'ng-senator-kebbi-south',
			name: 'Musa Garba Maidoki',
			party: 'APC',
		})
	})

	it('parses an OrderPaper HTML profile card', () => {
		const rows = parseOrderpaperMembers(ORDERPAPER_PROFILE)
		assert.deepEqual(rows, [
			{
				id: 'ng-senator-kebbi-south',
				name: 'Musa Garba Maidoki',
				party: 'PDP',
			},
		])
	})

	it('parses an OrderPaper House profile onto a vacant unlisted seat', () => {
		const rows = parseOrderpaperMembers(ORDERPAPER_HOUSE_PROFILE)
		assert.deepEqual(rows, [
			{
				id: 'ng-rep-anambra-oyi-ayamelum',
				name: 'Gwacham Maureen Chinwe',
				party: 'APGA',
			},
		])
		const graph = compileNigeriaGraph()
		applyVacantOccupancy(graph, rows)
		const filled = Object.values(graph.nodes).find(
			(node) => node.people[0]?.name === 'Gwacham Maureen Chinwe',
		)
		assert.equal(filled?.people[0]?.name, 'Gwacham Maureen Chinwe')
		assert.match(filled?.name ?? '', /oyi|ayamelum/i)
	})

	it('fills vacant Kebbi South from OrderPaper without inventing other seats', () => {
		const graph = compileNigeriaGraph()
		assert.equal(graph.nodes['ng-senator-kebbi-south'].people.length, 0)
		applyVacantOccupancy(graph, parseOrderpaperMembers(ORDERPAPER))
		assert.equal(
			graph.nodes['ng-senator-kebbi-south'].people[0]?.name,
			'Musa Garba Maidoki',
		)
		assert.equal(graph.nodes['ng-senator-kebbi-south'].people[0]?.party, 'APC')
	})
})
