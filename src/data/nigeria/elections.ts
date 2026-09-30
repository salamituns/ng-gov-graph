/**
 * The next general election, from INEC's revised timetable under the Electoral Act, 2026. Polls open at
 * 8:30 a.m. West Africa Time (UTC+1). Replace these when INEC issues a new timetable.
 */
export interface Poll {
	id: string
	label: string
	/** What voters choose on the day, for the card's subtitle. */
	offices: string
	opensAt: string
}

export const GENERAL_ELECTION = {
	name: '2027 General Election',
	sourceUrl: 'https://von.gov.ng/inec-issues-revised-timetable-for-2027-general-election/',
	sourceLabel: 'INEC revised timetable, 27 Feb 2026',
	authorityId: 'ng-inec',
	polls: [
		{
			id: 'federal',
			label: 'Presidential & National Assembly',
			offices: 'President, 109 senators and 360 representatives',
			opensAt: '2027-01-16T08:30:00+01:00',
		},
		{
			id: 'state',
			label: 'Governorship & State Houses of Assembly',
			offices: 'Governors in 28 states (8 vote off-cycle) and all 36 state assemblies',
			opensAt: '2027-02-06T08:30:00+01:00',
		},
	] satisfies Poll[],
}

/** The poll still to come at `now`, or null once every poll in the timetable has opened. */
export function nextPoll(now: Date, polls: Poll[] = GENERAL_ELECTION.polls) {
	return polls.find((poll) => Date.parse(poll.opensAt) > now.getTime()) ?? null
}

/** The road to polling day, from INEC's revised timetable and its later notices. */
export interface Milestone {
	id: string
	label: string
	/** First day, in Lagos time. */
	starts: string
	/** Last day, when the activity runs over a period. */
	ends?: string
	detail?: string
	sourceUrl: string
}

const TIMETABLE = GENERAL_ELECTION.sourceUrl

export const MILESTONES: Milestone[] = [
	{ id: 'primaries', label: 'Party primaries', starts: '2026-04-23', ends: '2026-05-30', detail: 'Parties choose their candidates and settle disputes over the primaries.', sourceUrl: TIMETABLE },
	{
		id: 'registration',
		label: 'Voter registration closes',
		starts: '2026-07-26',
		detail: 'The last of three registration phases ended. INEC registered 10.77 million new voters, subject to verification.',
		sourceUrl: 'https://www.channelstv.com/2026/09/29/2027-inec-fixes-october-9-for-pvc-collection-records-10-7m-registered-voters-1058758/',
	},
	{ id: 'federal-campaigns', label: 'Presidential and National Assembly campaigns open', starts: '2026-08-19', detail: 'Campaigns must stop 24 hours before polling day.', sourceUrl: TIMETABLE },
	{ id: 'state-campaigns', label: 'Governorship and State Assembly campaigns open', starts: '2026-09-09', detail: 'Campaigns must stop 24 hours before polling day.', sourceUrl: TIMETABLE },
	{
		id: 'pvc',
		label: 'PVC collection begins',
		starts: '2026-10-09',
		detail: 'New voters collect their Permanent Voter Cards. INEC has not yet announced an end date.',
		sourceUrl: 'https://tribuneonlineng.com/inec-announces-commencement-of-pvc-collection-for-2027-election/',
	},
	{ id: 'federal-poll', label: 'Presidential and National Assembly elections', starts: '2027-01-16', sourceUrl: TIMETABLE },
	{ id: 'state-poll', label: 'Governorship and State Assembly elections', starts: '2027-02-06', detail: 'Governors in 28 states and all 36 state assemblies.', sourceUrl: TIMETABLE },
]

/**
 * The eight states whose governorship elections run off the general-election cycle, after courts
 * reset their governors' four-year terms (s.180). INEC fixes each date separately, so the next one is
 * the month the current term's election would fall, not an announced date.
 */
export interface OffCycleState {
	stateId: string
	lastPoll: string
	sourceUrl: string
	/** Month the next election is expected, four years on. */
	nextExpected: string
}

export const OFF_CYCLE: OffCycleState[] = [
	{ stateId: 'ng-bayelsa-state', lastPoll: '2023-11-11', nextExpected: '2027-11', sourceUrl: 'https://en.wikipedia.org/wiki/2023_Bayelsa_State_gubernatorial_election' },
	{ stateId: 'ng-imo-state', lastPoll: '2023-11-11', nextExpected: '2027-11', sourceUrl: 'https://en.wikipedia.org/wiki/2023_Imo_State_gubernatorial_election' },
	{ stateId: 'ng-kogi-state', lastPoll: '2023-11-11', nextExpected: '2027-11', sourceUrl: 'https://en.wikipedia.org/wiki/2023_Kogi_State_gubernatorial_election' },
	{ stateId: 'ng-edo-state', lastPoll: '2024-09-21', nextExpected: '2028-09', sourceUrl: 'https://en.wikipedia.org/wiki/2024_Edo_State_gubernatorial_election' },
	{ stateId: 'ng-ondo-state', lastPoll: '2024-11-16', nextExpected: '2028-11', sourceUrl: 'https://en.wikipedia.org/wiki/2024_Ondo_State_gubernatorial_election' },
	{ stateId: 'ng-anambra-state', lastPoll: '2025-11-08', nextExpected: '2029-11', sourceUrl: 'https://www.channelstv.com/2025/11/09/breaking-its-soludo-governor-wins-anambra-election-by-landslide/' },
	{ stateId: 'ng-ekiti-state', lastPoll: '2026-06-20', nextExpected: '2030-06', sourceUrl: 'https://www.channelstv.com/2026/06/21/inec-declares-apcs-oyebanji-winner-of-ekiti-gov-election/' },
	{ stateId: 'ng-osun-state', lastPoll: '2026-08-15', nextExpected: '2030-08', sourceUrl: 'https://www.premiumtimesng.com/news/top-news/903305-updated-osundecides2026-inec-declares-accords-ademola-adeleke-winner-of-governorship-election.html' },
]

/** INEC's own services for voters. */
export const VOTER_LINKS = [
	{ id: 'verify', label: 'Check that you are registered', detail: 'INEC’s Voter Verification Service', href: 'https://cvr.inecnigeria.org/vvs' },
	{ id: 'pvc', label: 'Find where to collect your PVC', detail: 'INEC’s voter portal lists your collection centre', href: 'https://cvr.inecnigeria.org/' },
	{ id: 'unit', label: 'Find your polling unit', detail: 'INEC’s polling unit locator', href: 'https://cvr.inecnigeria.org/pu' },
	{ id: 'results', label: 'Follow results as they are uploaded', detail: 'INEC Result Viewing portal (IReV)', href: 'https://www.inecelectionresults.ng/' },
] as const

/** The next governorship election for a state: the general poll, or its own off-cycle month. */
export function governorshipFor(stateId: string) {
	if (stateId === 'ng-fct') return null
	const off = OFF_CYCLE.find((item) => item.stateId === stateId)
	if (off) return { offCycle: true as const, ...off }
	const poll = GENERAL_ELECTION.polls.find((item) => item.id === 'state')!
	return { offCycle: false as const, opensAt: poll.opensAt }
}
