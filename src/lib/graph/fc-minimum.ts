/**
 * The federal character card measures a state against the rule the page is about: section 147(3) asks for at
 * least one minister from every state. Stated as fact against that minimum, not as a ranking or a verdict.
 */

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
const word = (n: number) => WORDS[n] ?? String(n)
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** "One more than the Constitution's minimum", given this state's count and every state's. */
export function stateAgainstMinimum(count: number, allCounts: number[]): string {
	if (count === 0) return "Below the Constitution's minimum of one"
	if (count === 1) return "The Constitution's minimum: one per state"
	const most = Math.max(...allCounts)
	const extra = `${capital(word(count - 1))} more than the`
	if (count === most) {
		const tied = allCounts.filter((n) => n === most).length > 1
		return `${extra} minimum, ${tied ? 'joint most' : 'the most'} of any state`
	}
	return `${extra} Constitution's minimum`
}

/** "Five more than the minimum of one per state", given the counts of the zone's states. */
export function zoneAgainstMinimum(counts: number[]): string {
	const without = counts.filter((n) => n === 0).length
	const extra = counts.reduce((sum, n) => sum + Math.max(0, n - 1), 0)
	const gap = without ? `${capital(word(without))} ${without === 1 ? 'state has' : 'states have'} no minister on record` : ''
	if (!extra) return gap || 'One per state: the minimum for each'
	const line = `${capital(word(extra))} more than the minimum of one per state`
	return gap ? `${line}; ${gap.charAt(0).toLowerCase()}${gap.slice(1)}` : line
}
