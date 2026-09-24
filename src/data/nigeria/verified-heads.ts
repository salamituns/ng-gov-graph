import type { CompiledGraph, Officeholder } from '@/lib/graph/types'

// Current holders checked against the linked agency or federal government source on 2026-09-24.
// Keep the source with each name so a later appointment can be checked before replacing it.
const VERIFIED_HEADS: Record<string, { name: string; sourceUrl: string; replaces?: string }> = {
	'ng-ngsa': { name: 'Olusegun O. Ige', sourceUrl: 'https://ngsa.gov.ng/management-team/' },
	'ng-nitda': { name: 'Kashifu Inuwa Abdullahi', sourceUrl: 'https://nitda.gov.ng/management-team/' },
	'ng-ndpc': { name: 'Vincent O. Olatunji', sourceUrl: 'https://ndpc.gov.ng/a-paradigm-shift-dr-olatunji-tasks-staff-on-transformational-leadership/' },
	'ng-tetfund': { name: 'Sonny S. T. Echono', sourceUrl: 'https://www.tetfund.gov.ng/about' },
	'ng-fccpc': { name: 'Tunji Bello', sourceUrl: 'https://fccpc.gov.ng/about-us/people/board-members/mr-tunji-bello/' },
	'ng-ncdc': { name: 'Jide Idris', sourceUrl: 'https://www.ncdc.gov.ng/dg' },
	'ng-nhia': { name: 'Kelechi Ohiri', sourceUrl: 'https://www.nhia.gov.ng/dg-ceo/' },
	'ng-niprd': { name: 'Obi Adigwe', sourceUrl: 'https://niprd.gov.ng/administrative/' },
	'ng-nimr': { name: 'John Oladapo Obafunwa', sourceUrl: 'https://nimr.gov.ng/smc/' },
	'ng-naicom': { name: 'Olusegun Ayo Omosehin', sourceUrl: 'https://naicom.gov.ng/team/mr-olusegun-ayo-omosehin/' },
	'ng-sec': { name: 'Emomotimi Agama', sourceUrl: 'https://home.sec.gov.ng/about/organizational-chart/board-of-directors/' },
	'ng-rea': { name: 'Abba Abubakar Aliyu', sourceUrl: 'https://rea.gov.ng/meet-the-team.html' },
	'ng-nbs': { name: 'Adeyemi Adeniran', sourceUrl: 'https://www.nigerianstat.gov.ng/page/about-us' },
	'ng-onsa': { name: 'Nuhu Ribadu', sourceUrl: 'https://statehouse.gov.ng/president-tinubu-meets-high-level-delegation-from-the-united-states-africa-command/' },
	'ng-dss': { name: 'Tosin Ajayi', sourceUrl: 'https://statehouse.gov.ng/president-tinubu-meets-high-level-delegation-from-the-united-states-africa-command/' },
	'ng-nia': { name: 'Mohammed Mohammed', sourceUrl: 'https://statehouse.gov.ng/president-tinubu-meets-high-level-delegation-from-the-united-states-africa-command/' },
	'ng-dia': { name: 'Emmanuel Akomaye Parker Undiandeye', sourceUrl: 'https://statehouse.gov.ng/curriculum-vitae-of-new-service-chiefs/' },
	'ng-bpp': { name: 'Adebowale Adedokun', sourceUrl: 'https://www.bpp.gov.ng/wp-content/uploads/2024/11/Dr.-Adebowale-Adedokun-assumes-office-as-the-Director-General-Bureau-of-Public-Procurement-BPP.pdf' },
	'ng-nfiu': { name: 'Hafsat Abubakar Bakari', sourceUrl: 'https://nfiu.gov.ng/NewsDetail?id=9119' },
	'ng-nigerian-army': { name: 'Waidi Shaibu', sourceUrl: 'https://statehouse.gov.ng/president-bola-ahmed-tinubu-met-with-the-security-chiefs-at-the-state-house-abuja/' },
	'ng-nigerian-navy': { name: 'Idi Abbas', sourceUrl: 'https://statehouse.gov.ng/president-bola-ahmed-tinubu-met-with-the-security-chiefs-at-the-state-house-abuja/' },
	'ng-nigerian-air-force': { name: 'Sunday Kelvin Aneke', sourceUrl: 'https://statehouse.gov.ng/curriculum-vitae-of-new-service-chiefs/' },
	'ng-nuc': { name: 'Abdullahi Yusufu Ribadu', sourceUrl: 'https://www.nuc.edu.ng/prof-ribadu-unveils-blueprint-2-0-to-drive-comprehensive-reform-of-nigerian-universities/' },
	'ng-nbte': { name: 'Idris Muhammad Bugaje', sourceUrl: 'https://dms.nbte.gov.ng/about' },
	'ng-jamb': { name: 'Segun Aina', sourceUrl: 'https://www.jamb.gov.ng/Management', replaces: 'Is-haq Oloyede' },
	'ng-neco': { name: 'Dantani Ibrahim Wushishi', sourceUrl: 'https://neco.gov.ng/2026%20GUIDELINES.pdf' },
	'ng-ubec': { name: 'Aisha Garba', sourceUrl: 'https://ubec.gov.ng/office-of-the-executive-secretary/' },
	'ng-customs': { name: 'Bashir Adewale Adeniyi', sourceUrl: 'https://customs.gov.ng/wp-content/uploads/2026/04/Press-Release-Visit-Malaysian-Customs-pdf.pdf' },
	'ng-ndic': { name: 'Thompson Oludare Sunday', sourceUrl: 'https://ndic.gov.ng/news-detail?id=29' },
	'ng-dmo': { name: 'Patience Oniha', sourceUrl: 'https://www.dmo.gov.ng/about-dmo/dmo-management-team' },
	'ng-pencom': { name: 'Omolola Oloworaran', sourceUrl: 'https://www.pencom.gov.ng/category/about-us/members-of-the-board/' },
	'ng-police-service-commission': { name: 'Hashimu Salihu Argungu', sourceUrl: 'https://psc.gov.ng/the-hon-chairman/' },
	'ng-federal-civil-service-commission': { name: 'Tunji Olaopa', sourceUrl: 'https://fmino.gov.ng/fcsc-chairman-advocates-merit-driven-civil-service-reform-at-global-conference/' },
	'ng-rmafc': { name: 'Mohammed Bello Shehu', sourceUrl: 'https://rmafc.gov.ng/members/' },
	'ng-office-of-the-auditor-general': { name: 'Shaakaa Kanyitor Chira', sourceUrl: 'https://oaugf.ng/13-profiles/' },
	'ng-nhrc': { name: 'Anthony Ojukwu', sourceUrl: 'https://nigeriarights.gov.ng/nhrc-media/news-and-events/655-continental-win-for-nigeria-as-ojukwu-takes-vp-seat-in-anpmn.html' },
	'ng-ncc': { name: 'Aminu Maida', sourceUrl: 'https://old.ncc.gov.ng/the-ncc/commissioners/1414-executive-vice-chairman-aminu-maida' },
	'ng-nimasa': { name: 'Dayo Mobereola', sourceUrl: 'https://nimasa.gov.ng/nimasa-celebrates-women-reaffirms-inclusive-maritime-growth/' },
	'ng-npa': { name: 'Abubakar Dantsoho', sourceUrl: 'https://nigerianports.gov.ng/2026/03/12/npa-port-modernisation-nsw-as-catalysts-for-new-era-of-trade/' },
	'ng-ncaa': { name: 'Chris Ona Najomo', sourceUrl: 'https://www.ncaa.gov.ng/media/news/ncaa-engages-stakeholders-ahead-of-2026-hajj-operations/' },
	'ng-ndlea': { name: 'Mohamed Buba Marwa', sourceUrl: 'https://ndlea.gov.ng/blog/marwa-charges-traditional-rulers-parents-to-take-ownership-of-war-against-drug-abuse' },
	'ng-firs': { name: 'Zacch Adedeji', sourceUrl: 'https://statehouse.gov.ng/president-tinubu-commends-economic-team-and-ngx-for-stabilising-the-economy-and-the-rebound-of-the-stock-market/' },
}

export function applyVerifiedHeads(graph: CompiledGraph): CompiledGraph {
	for (const [orgId, holder] of Object.entries(VERIFIED_HEADS)) {
		const org = graph.nodes[orgId]
		const seat = org?.head ? graph.nodes[org.head] : undefined
		if (!seat || !org) continue
		const oldName = seat.people[0]?.name
		if (oldName ? oldName !== holder.replaces || org.people[0]?.name !== oldName : !seat.unrecorded || org.people.length) continue
		const person: Officeholder = { name: holder.name, sourceUrl: holder.sourceUrl, sourceCheckedAt: '2026-09-24' }
		seat.people = [person]
		org.people = [person]
		delete seat.unrecorded
	}
	return graph
}
