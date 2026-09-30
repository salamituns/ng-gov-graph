/**
 * The constitutional rules behind the links on the map, in plain language.
 *
 * Source: the Constitution of the Federal Republic of Nigeria 1999, as amended. Only rules the
 * Constitution itself sets are here. Most agencies, and the ministries' oversight of them, rest on
 * Acts of the National Assembly instead; those links carry no constitutional citation, and each
 * agency's own page links to its Act.
 */
export interface Provision {
	/** How the section is cited, e.g. "s.147(2)" or "Third Schedule". */
	cite: string
	/** One or two sentences a secondary-school student could follow. */
	text: string
	/** Section anchor on the published text. */
	section: string
}

export const CONSTITUTION_URL = 'https://www.constituteproject.org/constitution/Nigeria_2011'

export function provisionUrl(provision: Provision) {
	return `${CONSTITUTION_URL}#${provision.section}`
}

export const PROVISIONS = {
	electPresident: {
		cite: 's.132–134',
		text: 'Voters elect the President every four years. To win outright, a candidate needs the most votes and at least a quarter of the votes cast in two-thirds of the states and the FCT.',
		section: 's134',
	},
	electVicePresident: {
		cite: 's.142',
		text: 'The Vice-President is not elected separately: each presidential candidate names a running mate, who is elected on the same ticket.',
		section: 's142',
	},
	electNationalAssembly: {
		cite: 's.47–49',
		text: 'The National Assembly is two chambers, the Senate and the House of Representatives, and voters elect both.',
		section: 's47',
	},
	electSenator: {
		cite: 's.48',
		text: 'Each state elects three senators, one per senatorial district, and the FCT elects one: 109 in all.',
		section: 's48',
	},
	electRepresentative: {
		cite: 's.49',
		text: 'The House of Representatives has 360 members, each elected by one federal constituency of roughly equal population.',
		section: 's49',
	},
	electPresidingOfficers: {
		cite: 's.50',
		text: 'Each chamber elects its own presiding officers from among its members: the Senate its President and Deputy, the House its Speaker and Deputy.',
		section: 's50',
	},
	electGovernor: {
		cite: 's.176–179',
		text: 'Each state’s voters elect its Governor. To win outright, a candidate needs the most votes and at least a quarter of the votes in two-thirds of the state’s local government areas.',
		section: 's179',
	},
	stateAssembly: {
		cite: 's.90–91',
		text: 'Every state has a House of Assembly, elected by its people, which makes the state’s laws.',
		section: 's90',
	},
	executivePower: {
		cite: 's.5(1)',
		text: 'The executive power of the Federation belongs to the President, who may exercise it directly or through the Vice-President, ministers and other officers.',
		section: 's5',
	},
	ministers: {
		cite: 's.147(2)',
		text: 'The President appoints every minister, but only after the Senate confirms the nomination. At least one minister must come from each state (s.147(3)).',
		section: 's147',
	},
	attorneyGeneral: {
		cite: 's.150',
		text: 'The Attorney-General is the chief law officer of the Federation and a minister, appointed and confirmed like the others under s.147.',
		section: 's150',
	},
	fct: {
		cite: 's.299, s.302',
		text: 'The President governs the Federal Capital Territory directly and may delegate those powers to a minister. The FCT has no elected governor.',
		section: 's302',
	},
	federalBodies: {
		cite: 's.153–154',
		text: 'Section 153 creates the federal commissions, among them INEC, the Code of Conduct Bureau and the Federal Character Commission. The President appoints their chairs and members, subject to Senate confirmation, and can remove them only with the backing of two-thirds of the Senate (s.157).',
		section: 's154',
	},
	councilChair: {
		cite: 's.153, Third Schedule',
		text: 'Section 153 creates the Council of State, the National Defence Council, the National Security Council and the Nigeria Police Council. The Third Schedule sets their members and makes the President chair of each.',
		section: 's153',
	},
	economicCouncil: {
		cite: 's.153, Third Schedule',
		text: 'The National Economic Council brings together the 36 state governors and the Governor of the Central Bank, with the Vice-President as chair. It advises the President on economic affairs.',
		section: 's153',
	},
	judicialCouncils: {
		cite: 's.153, Third Schedule',
		text: 'The Chief Justice of Nigeria chairs both the National Judicial Council and the Federal Judicial Service Commission.',
		section: 's153',
	},
	njc: {
		cite: 'Third Schedule, Part I',
		text: 'The National Judicial Council recommends who should be appointed to the superior courts, and disciplines and can recommend the removal of judges.',
		section: 's153',
	},
	chiefJustice: {
		cite: 's.231(1)',
		text: 'The President appoints the Chief Justice of Nigeria on the recommendation of the National Judicial Council, subject to confirmation by the Senate.',
		section: 's231',
	},
	courtOfAppeal: {
		cite: 's.238(1)',
		text: 'The President appoints the President of the Court of Appeal on the recommendation of the National Judicial Council, subject to confirmation by the Senate.',
		section: 's238',
	},
	federalHighCourt: {
		cite: 's.250(1)',
		text: 'The President appoints the Chief Judge of the Federal High Court on the recommendation of the National Judicial Council, subject to confirmation by the Senate.',
		section: 's250',
	},
	codeOfConductTribunal: {
		cite: 'Fifth Schedule, Part I',
		text: 'The Code of Conduct Tribunal tries public officers who breach the Code of Conduct. The President appoints its chair and members on the recommendation of the National Judicial Council.',
		section: 's153',
	},
	appeals: {
		cite: 's.233',
		text: 'Appeals from the Court of Appeal go to the Supreme Court, whose decision is final.',
		section: 's233',
	},
	secretaryToGovernment: {
		cite: 's.171',
		text: 'The Secretary to the Government of the Federation is appointed by the President and serves at the President’s pleasure.',
		section: 's171',
	},
	headOfService: {
		cite: 's.171',
		text: 'The President appoints the Head of the Civil Service of the Federation from among the most senior permanent secretaries.',
		section: 's171',
	},
	auditorGeneral: {
		cite: 's.86(1)',
		text: 'The President appoints the Auditor-General on the recommendation of the Federal Civil Service Commission, subject to confirmation by the Senate. The Auditor-General reports on federal accounts to the National Assembly.',
		section: 's86',
	},
	inspectorGeneral: {
		cite: 's.215(1)',
		text: 'The President appoints the Inspector-General of Police on the advice of the Nigeria Police Council, from among serving senior police officers.',
		section: 's215',
	},
	armedForces: {
		cite: 's.217–218',
		text: 'The armed forces are an army, a navy and an air force. The President is Commander-in-Chief and appoints the service chiefs.',
		section: 's218',
	},
} satisfies Record<string, Provision>

export type ProvisionKey = keyof typeof PROVISIONS

/** Bodies created by section 153 whose chair the President appoints under section 154. */
export const SECTION_153_BODIES = new Set([
	'ng-inec',
	'ng-code-of-conduct-bureau',
	'ng-federal-character-commission',
	'ng-federal-civil-service-commission',
	'ng-national-population-commission',
	'ng-police-service-commission',
	'ng-rmafc',
])

/** Councils created by section 153 that the President chairs. */
export const PRESIDENTIAL_COUNCILS = new Set([
	'ng-council-of-state',
	'ng-national-defence-council',
	'ng-national-security-council',
	'ng-nigeria-police-council',
])
