import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { compileNigeriaGraph } from './nigeria'
import { applyVacantOccupancy } from './wiki-fill'
import { parseNaltfMembers } from './naltf-fill'

const NALTF_MARKDOWN = `
## Hon. Abbas Tajudeen

**State:** Kaduna

**Constituency:** Zaria

**Party:** APC

## Hon. Thaddeus Attah

**State:** Lagos

**Constituency:** Eti-Osa

**Party:** NDC

## Hon. Ajiya Abdulrahaman

**State:** F.C.T

**Constituency:** Abaji/Gwagwalada/Kuje/Kwali

**party:** APC

## Hon. Olajide Adedeji Stanley

**State:** Oyo **Constituency:** Ibadan South West/Ibadan North West **Party:** APM

## Member not found
`

const NALTF_HTML = `
<h2>Hon. Yusuf Shitu Galambi</h2>
<p><strong>State:</strong> Jigawa</p>
<p><strong>Constituency:</strong> Gwaram</p>
<p><strong>Party:</strong> NNPP</p>
<h2>Hon. Abbas Tajudeen</h2>
<p><strong>State: </strong>Kaduna<br /><strong>Constituency:&nbsp;</strong>Zaria<br /><strong>Party:&nbsp;</strong>APC</p>
`

describe('naltf house occupancy', () => {
	it('parses markdown member cards including FCT and inline fields', () => {
		const rows = parseNaltfMembers(NALTF_MARKDOWN)
		assert.deepEqual(
			rows.map((row) => [row.id, row.name, row.party]),
			[
				['ng-rep-kaduna-zaria', 'Abbas Tajudeen', 'APC'],
				['ng-rep-lagos-eti-osa', 'Thaddeus Attah', 'NDC'],
				[
					'ng-rep-fct-abaji-gwagwalada-kuje-kwali',
					'Ajiya Abdulrahaman',
					'APC',
				],
				[
					'ng-rep-oyo-ibadan-south-west-ibadan-north-west',
					'Olajide Adedeji Stanley',
					'APM',
				],
			],
		)
	})

	it('parses HTML member cards', () => {
		const rows = parseNaltfMembers(NALTF_HTML)
		assert.deepEqual(
			rows.map((row) => [row.id, row.name, row.party]),
			[
				['ng-rep-jigawa-gwaram', 'Yusuf Shitu Galambi', 'NNPP'],
				['ng-rep-kaduna-zaria', 'Abbas Tajudeen', 'APC'],
			],
		)
	})

	it('parks a second member with the same constituency slug on a vacant unlisted seat', () => {
		const graph = compileNigeriaGraph()
		const rows = parseNaltfMembers(`
## Hon. Zzyzx Alpha

**State:** Rivers

**Constituency:** Ahoada West/Ogba-Egbema/Ndoni

**Party:** APC

## Hon. Qyrim Beta

**State:** Rivers

**Constituency:** Ahoada West/Ogba-Egbema/Ndoni

**Party:** APC
`)
		assert.equal(rows.length, 2)
		assert.notEqual(rows[0].id, rows[1].id)
		applyVacantOccupancy(graph, rows)
		const riversHolders = Object.values(graph.nodes)
			.filter((node) => node.id.startsWith('ng-rep-rivers-') && node.people[0]?.name)
			.map((node) => node.people[0].name)
			.sort()
		assert.deepEqual(
			riversHolders.filter(
				(name) => name === 'Zzyzx Alpha' || name === 'Qyrim Beta',
			).sort(),
			['Qyrim Beta', 'Zzyzx Alpha'],
		)
	})

	it('fills vacant House seats from NALTF without inventing unmatched names', () => {
		const graph = compileNigeriaGraph()
		graph.nodes['ng-rep-kaduna-zaria'].people = [
			{ name: 'Existing Holder', appointedYear: 2023, party: 'APC' },
		]
		graph.nodes['ng-rep-lagos-eti-osa'].people = []
		applyVacantOccupancy(graph, parseNaltfMembers(NALTF_MARKDOWN))
		assert.equal(
			graph.nodes['ng-rep-kaduna-zaria'].people[0]?.name,
			'Existing Holder',
		)
		assert.equal(
			graph.nodes['ng-rep-lagos-eti-osa'].people[0]?.name,
			'Thaddeus Attah',
		)
	})
})
