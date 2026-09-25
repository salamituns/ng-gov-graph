import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { applyAppointments, appointmentsFromNews, diffOfficeholders, mergeChanges, mergeNews } from './changes'
import { mentionLabels } from './mentions'
import { compileNigeriaGraph } from './nigeria'

const graph = compileNigeriaGraph()

describe('personnel change detection', () => {
	it('reports a replaced officeholder with the predecessor, but not a first-time fill', () => {
		const previous = structuredClone(graph)
		const next = structuredClone(graph)
		previous.nodes['ng-frsc-head'].people = []
		next.nodes['ng-minister-of-finance'].people = [{ name: 'Ada Example' }]
		next.nodes['ng-frsc-head'].people = [{ name: 'New Marshal' }]
		const changes = diffOfficeholders(previous, next, '2026-09-24')
		assert.equal(changes.length, 1)
		assert.equal(changes[0].personName, 'Ada Example')
		assert.equal(changes[0].predecessorName, graph.nodes['ng-minister-of-finance'].people[0].name)
		assert.equal(changes[0].entryMode, 'appointed')
		assert.equal(changes[0].groupId, 'ng-ministry-of-finance')
	})

	it('reads appointments from official announcements', () => {
		const changes = appointmentsFromNews([{
			id: 'n1', url: 'https://statehouse.gov.ng/x', publication: 'State House', publishedAt: '2026-09-20',
			summary: 'PRESIDENT TINUBU APPOINTS NEW STATISTICIAN-GENERAL',
			excerpt: 'President Bola Ahmed Tinubu has approved the appointment of Dr Jane Doe as the Statistician-General of the Federation and Chief Executive of the National Bureau of Statistics.',
		}], mentionLabels(graph), graph)
		assert.equal(changes.length, 1)
		assert.equal(changes[0].personName, 'Jane Doe')
		assert.equal(changes[0].groupId, 'ng-nbs')
		assert.equal(changes[0].date, '2026-09-20')
	})

	it('reads the headline, resolves the seat, and skips advisers', () => {
		const labels = mentionLabels(graph)
		const changes = appointmentsFromNews([
			{ id: 'a', url: 'https://statehouse.gov.ng/a', publication: 'State House', publishedAt: '2026-08-19', summary: 'PRESIDENT TINUBU APPOINTS ABEL OLUMUYIWA ENITAN AS HEAD OF THE CIVIL SERVICE OF THE FEDERATION' },
			{ id: 'b', url: 'https://statehouse.gov.ng/b', publication: 'State House', publishedAt: '2026-07-26', summary: 'PRESIDENT TINUBU APPOINTS WASIU SMART AS SPECIAL ADVISER ON NATIONAL ASSEMBLY MATTERS' },
		], labels, graph)
		assert.equal(changes.length, 1)
		assert.equal(changes[0].personName, 'Abel Olumuyiwa Enitan')
		assert.equal(changes[0].positionId, 'ng-ohcsf-head')
		const filled = applyAppointments(structuredClone(graph), changes)
		assert.equal(filled.nodes['ng-ohcsf-head'].people[0]?.name, 'Abel Olumuyiwa Enitan')
		assert.equal(filled.nodes['ng-ohcsf'].people[0]?.name, 'Abel Olumuyiwa Enitan')
		const sworn = { ...changes[0], id: 'sworn', date: '2026-08-27', personName: 'Abel Enitan', entryMode: 'sworn' as const }
		const merged = mergeChanges([], [sworn, changes[0]])
		assert.equal(merged.length, 1)
		assert.deepEqual([merged[0].date, merged[0].personName], ['2026-08-19', 'Abel Olumuyiwa Enitan'])
	})

	it('reads article bodies: predecessors, lists, renewals, and board chairs', () => {
		const labels = mentionLabels(graph)
		const item = (id: string, date: string) => ({ id, url: `https://statehouse.gov.ng/${id}`, publication: 'State House', publishedAt: date, summary: 'PRESIDENT TINUBU MAKES APPOINTMENTS' })
		const bodies = {
			'https://statehouse.gov.ng/hos': 'President Bola Ahmed Tinubu has appointed Mr Abel Olumuyiwa Enitan as the Head of the Civil Service of the Federation, effective August 27, 2026.\nMr Enitan succeeds Mrs Didi Esther Walson-Jack, who will retire soon.',
			'https://statehouse.gov.ng/renew': 'President Bola Ahmed Tinubu has renewed the tenure of the Director-General of the NTA and the Managing Director of the NAN.\nPresident Tinubu first appointed Abdulhamid Salihu Dembos of the NTA and Ali Mohammed Ali of the NAN on October 20, 2023.',
			'https://statehouse.gov.ng/list': 'President Bola Ahmed Tinubu has announced 26 new appointments, with former governor of Ekiti State, Ayo Fayose, emerging as chairman of the Rural Electrification Agency (REA), and Major General Junaid Bindawa as chairman of the Wages Commission.\nPresident Tinubu also appointed Dr Abuh Mohammed as Director-General of the National Population Commission, Dr Akinola Odeyemi as Managing Director of the Nigerian Bulk Electricity Trading (NBET), and Dr Anthony Inalegwu Godwin as chairman/CEO of the Nigeria Atomic Energy Commission.',
		}
		const changes = appointmentsFromNews([item('hos', '2026-08-19'), item('renew', '2026-08-23'), item('list', '2026-07-21')], labels, graph, bodies)
		const by = (name: string) => changes.find((change) => change.personName === name)
		assert.equal(by('Abel Olumuyiwa Enitan')?.predecessorName, 'Didi Esther Walson-Jack')
		assert.equal(by('Abdulhamid Salihu Dembos')?.entryMode, 'reappointed')
		assert.equal(by('Ali Mohammed Ali')?.positionId, 'ng-nan-head')
		assert.equal(by('Abuh Mohammed')?.positionId, 'ng-national-population-commission', 'a DG is not the Commission chairman')
		assert.equal(by('Ayo Fayose')?.positionId, 'ng-rea', 'a board chairman is not the agency head')
		assert.equal(changes.some((change) => change.personName === 'Akinola Odeyemi'), false, 'NBET is not in the graph')
	})

	it('keeps history and the first date a change was seen', () => {
		const first = { kind: 'personnel' as const, id: 'a', date: '2026-09-01', personName: 'Ada', positionId: 'p', positionName: 'P', groupId: 'g', entryMode: 'appointed' as const, departure: false, predecessorName: null }
		const merged = mergeChanges([first], [{ ...first, id: 'b', date: '2026-09-10' }, { ...first, id: 'c', personName: 'Bola', date: '2026-09-05' }])
		assert.deepEqual(merged.map((change) => [change.personName, change.date]), [['Bola', '2026-09-05'], ['Ada', '2026-09-01']])
		const news = mergeNews([{ id: '1', url: 'u1', summary: 'a', publication: 'p', publishedAt: '2026-09-01' }], [{ id: '2', url: 'u2', summary: 'b', publication: 'p', publishedAt: '2026-09-02' }])
		assert.deepEqual(news.map((item) => item.url), ['u2', 'u1'])
	})

	it('accepts a later official appointment without replaying older news over a checked holder', () => {
		const checked = structuredClone(graph)
		const base = { kind: 'personnel' as const, id: 'later', personName: 'New Director', positionId: 'ng-ngsa-head', positionName: 'Director-General', groupId: 'ng-ngsa', entryMode: 'appointed' as const, departure: false, predecessorName: null, sourceUrl: 'https://ngsa.gov.ng/new-director/' }
		applyAppointments(checked, [{ ...base, date: '2026-09-20' }])
		assert.equal(checked.nodes['ng-ngsa-head'].people[0]?.name, 'Olusegun O. Ige')
		applyAppointments(checked, [{ ...base, date: '2026-09-25' }])
		assert.equal(checked.nodes['ng-ngsa-head'].people[0]?.name, 'New Director')
		assert.equal(checked.nodes['ng-ngsa'].people[0]?.sourceUrl, base.sourceUrl)
	})
})
