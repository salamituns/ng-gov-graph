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
