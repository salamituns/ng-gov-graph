import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { compileNigeriaGraph } from './nigeria'
import {
	adoptConstituencyIds,
	applyVacantOccupancy,
	parseDelegationTenthAssembly,
	parseHouseMembersList,
	parseSenateTemplate,
} from './wiki-fill'

const SENATE_FIXTURE = `
|group1 =[[Nigerian National Assembly delegation from Abia|Abia]]
|list1 =
*{{Party stripe|Peoples Democratic Party (Nigeria)}}C: [[Austin Akobundu]] (PDP)
*{{Party stripe|All Progressives Congress}}N: [[Orji Uzor Kalu]] (APC)
*{{Party stripe|All Progressives Grand Alliance}}S: [[Enyinnaya Abaribe]] (APGA)

|group2 =[[Nigerian National Assembly delegation from Kebbi|Kebbi]]
|list2 =
*{{Party stripe|Peoples Democratic Party (Nigeria)}}C: [[Adamu Aliero]] (PDP)
*{{Party stripe|Peoples Democratic Party (Nigeria)}}N: [[Yahaya Abubakar Abdullahi]] (PDP)
*{{Party stripe|Peoples Democratic Party (Nigeria)}}S: [[TBD]] (TBD)

|group3 =[[Nigerian National Assembly delegation from Sokoto|Sokoto]]
|list3 =
*{{Party stripe|All Progressives Congress}}S: [[Ibrahim Gobir]] (APC)
*{{Party stripe|All Progressives Congress}}S: [[Aliyu Wamakko]] (APC)
*{{Party stripe|Peoples Democratic Party (Nigeria)}}S: [[Aminu Tambuwal]] (PDP)
`

const LAGOS_DELEGATION = `
===9th Assembly (2019-2023)===
{| class="wikitable"
|[[Someone Old]]
|[[APC]]
|Lagos Central
|}

===10th Assembly (2023-till date)===
{| class="wikitable"
|-
! Senator
! Party
! Constituency
|-
| [[Wasiu Sanni]]
| [[All Progressives Congress|APC]]
| Lagos Central
|-
! Representative
! Party
! Constituency
|-
|[[Alli Adeyemi]]
||[[All Progressives Congress|APC]]
|Mushin I
|-
|[[Babajimi Benson]]
||[[All Progressives Congress|APC]]
|Ikorodu
|}

==8th Assembly==
|[[Ignore Me]]
|[[APC]]
|Lagos West
`

describe('wiki occupancy fill', () => {
	it('parses named 10th Assembly senators and skips TBD', () => {
		const rows = parseSenateTemplate(SENATE_FIXTURE)
		assert.deepEqual(
			rows.map((row) => [row.id, row.name, row.party]),
			[
				['ng-senator-abia-central', 'Austin Akobundu', 'PDP'],
				['ng-senator-abia-north', 'Orji Uzor Kalu', 'APC'],
				['ng-senator-abia-south', 'Enyinnaya Abaribe', 'APGA'],
				['ng-senator-kebbi-central', 'Adamu Aliero', 'PDP'],
				['ng-senator-kebbi-north', 'Yahaya Abubakar Abdullahi', 'PDP'],
				['ng-senator-sokoto-north', 'Ibrahim Gobir', 'APC'],
				['ng-senator-sokoto-east', 'Aliyu Wamakko', 'APC'],
				['ng-senator-sokoto-south', 'Aminu Tambuwal', 'PDP'],
			],
		)
	})

	it('parses only the 10th Assembly table from a state delegation page', () => {
		const rows = parseDelegationTenthAssembly(LAGOS_DELEGATION, 'lagos')
		assert.deepEqual(
			rows.map((row) => [row.id, row.name, row.party]),
			[
				['ng-senator-lagos-central', 'Wasiu Sanni', 'APC'],
				['ng-rep-lagos-mushin-i', 'Alli Adeyemi', 'APC'],
				['ng-rep-lagos-ikorodu', 'Babajimi Benson', 'APC'],
			],
		)
	})

	it('fills vacant seats and leaves occupied NASS names in place', () => {
		const graph = compileNigeriaGraph()
		graph.nodes['ng-senator-abia-north'].people = [
			{ name: 'NASS Orji', appointedYear: 2023, party: 'APC' },
		]
		graph.nodes['ng-senator-abia-central'].people = []
		graph.nodes['ng-senator-kebbi-south'].people = []
		applyVacantOccupancy(graph, parseSenateTemplate(SENATE_FIXTURE))
		assert.equal(graph.nodes['ng-senator-abia-north'].people[0]?.name, 'NASS Orji')
		assert.equal(
			graph.nodes['ng-senator-abia-central'].people[0]?.name,
			'Austin Akobundu',
		)
		assert.equal(graph.nodes['ng-senator-kebbi-south'].people.length, 0)
	})

	it('parks unmatched House names on vacant unlisted seats in that state', () => {
		const graph = compileNigeriaGraph()
		applyVacantOccupancy(graph, [
			{ id: 'ng-rep-abia-zzzz-wiki-district', name: 'Wiki Representative', party: 'LP' },
		])
		assert.equal(
			graph.nodes['ng-rep-abia-unlisted-1'].people[0]?.name,
			'Wiki Representative',
		)
	})

	it('parses the Wikipedia 10th House members table onto vacant named seats', () => {
		const rows = parseHouseMembersList(`
== Members ==
{| class="wikitable sortable"
|-
| rowspan="1" valign="top" |[[Nigerian National Assembly delegation from Kano|Kano]]
| align="center" |Dawakin Kudu/Warawa
|{{sortname|Hassan|Mohammed|Hassan Mohammed}}
| bgcolor="" |
|[[New Nigeria People's Party|NNPP]]
| align="center" |12 June 2023
|-
| rowspan="1" valign="top" |[[Nigerian National Assembly delegation from Bauchi|Bauchi]]
| align="center" |Zaki
|{{sortname|Muhammed|Dan Abba Shehu|Muhammed Dan Abba Shehu}}
| bgcolor="" |
|[[Peoples Democratic Party (Nigeria)|PDP]]
| align="center" |12 June 2023
|}
`)
		assert.equal(
			rows.find((row) => row.id.includes('dawakin'))?.name,
			'Hassan Mohammed',
		)
		assert.equal(
			rows.find((row) => row.id.includes('zaki'))?.name,
			'Muhammed Dan Abba Shehu',
		)
	})

	it('does not park a reordered Karaye/Rogo name ahead of Gaya/Ajingi/Albasu', () => {
		const graph = compileNigeriaGraph()
		applyVacantOccupancy(graph, [
			{
				id: 'ng-rep-kano-kabaye-rogo',
				name: 'Sani Abdullahi Rogo',
				party: 'NNPP',
			},
			{
				id: 'ng-rep-kano-gaya-ajingi-albasu',
				name: 'Mustapha Tijjani Ghali',
				party: 'NNPP',
			},
		])
		assert.equal(
			Object.values(graph.nodes).some(
				(node) => node.people[0]?.name === 'Sani Abdullahi Rogo',
			),
			false,
		)
		const ghali = Object.values(graph.nodes).find(
			(node) => node.people[0]?.name === 'Mustapha Tijjani Ghali',
		)
		assert.match(ghali?.name ?? '', /gaya|ajingi|albasu/i)
	})

	it('fills Zango/Baure and Malumfashi instead of a Musawa duplicate or a state-only pad', () => {
		const graph = compileNigeriaGraph()
		applyVacantOccupancy(graph, [
			{
				id: 'ng-rep-katsina-matazu-musawa',
				name: 'Ahmed Aliyu Abdullahi',
				party: 'APC',
			},
			{
				id: 'ng-rep-katsina-katsina',
				name: 'Aliyu Sani Danlami',
				party: 'APC',
			},
			{
				id: 'ng-rep-katsina-zango-baure',
				name: 'Lawal Sani',
				party: 'APC',
			},
			{
				id: 'ng-rep-katsina-kafur-malumfashi',
				name: 'Muhammad Aminu Ibrahim',
				party: 'APC',
			},
		])
		assert.equal(
			Object.values(graph.nodes).some(
				(node) => node.people[0]?.name === 'Ahmed Aliyu Abdullahi',
			),
			false,
		)
		assert.equal(
			Object.values(graph.nodes).some(
				(node) => node.people[0]?.name === 'Aliyu Sani Danlami',
			),
			false,
		)
		const lawal = Object.values(graph.nodes).find(
			(node) => node.people[0]?.name === 'Lawal Sani',
		)
		const aminu = Object.values(graph.nodes).find(
			(node) => node.people[0]?.name === 'Muhammad Aminu Ibrahim',
		)
		assert.match(lawal?.name ?? '', /zango|baure/i)
		assert.match(aminu?.name ?? '', /malumfashi|kafur/i)
	})

	it('replaces a garbled unlisted label when the same member has a clearer constituency', () => {
		const graph = compileNigeriaGraph()
		applyVacantOccupancy(graph, [
			{
				id: 'ng-rep-katsina-kafub-malushi',
				name: 'Muhammad Aminu Ibrahim',
				party: 'APC',
			},
		])
		applyVacantOccupancy(graph, [
			{
				id: 'ng-rep-katsina-kafur-malumfashi',
				name: 'Muhammad Aminu Ibrahim',
				party: 'APC',
			},
		])
		const node = Object.values(graph.nodes).find(
			(item) => item.people[0]?.name === 'Muhammad Aminu Ibrahim',
		)
		assert.match(node?.name ?? '', /kafur malumfashi/i)
	})

	it('gives an occupied unlisted House seat the constituency id from its label', () => {
		const graph = compileNigeriaGraph()
		const pad = graph.nodes['ng-rep-katsina-unlisted-1']
		assert.ok(pad)
		pad.people = [{ name: 'Lawal Sani', appointedYear: 2023, party: 'APC' }]
		pad.name = 'Representative for zango baure'
		adoptConstituencyIds(graph)
		assert.equal(
			graph.nodes['ng-rep-katsina-zango-baure']?.people[0]?.name,
			'Lawal Sani',
		)
		assert.equal(graph.nodes['ng-rep-katsina-unlisted-1'], undefined)
		assert.equal(
			Object.values(graph.edges).some(
				(edge) =>
					edge.fromId === 'ng-rep-katsina-zango-baure' ||
					edge.toId === 'ng-rep-katsina-zango-baure',
			),
			true,
		)
	})

	it('does not park a duplicate of a name already occupying a House seat in that state', () => {
		const graph = compileNigeriaGraph()
		graph.nodes['ng-rep-abia-unlisted-1'].people = []
		graph.nodes['ng-rep-abia-unlisted-2'].people = []
		const named = Object.keys(graph.nodes).find(
			(id) => id.startsWith('ng-rep-abia-') && !id.includes('unlisted'),
		)
		assert.ok(named)
		graph.nodes[named].people = [
			{ name: 'Alex Ikwechegh', appointedYear: 2023, party: 'PDP' },
		]
		applyVacantOccupancy(graph, [
			{
				id: 'ng-rep-abia-aba-north-aba-south-alt',
				name: 'Ikwechegh Alexander Mascot',
				party: 'APGA',
			},
		])
		assert.equal(graph.nodes['ng-rep-abia-unlisted-1'].people.length, 0)
		assert.equal(graph.nodes['ng-rep-abia-unlisted-2'].people.length, 0)
	})
})
