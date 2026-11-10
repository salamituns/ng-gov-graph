/** ISO calendar day in Nigeria; also a stable key for daily browser calculations. */
export function lagosDay(value: Date): string {
	return value.toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
}

/** A date-only election value is noon in Lagos, avoiding accidental day shifts. */
export function formatLagosDate(iso: string): string {
	return new Date(`${iso}T12:00:00+01:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' })
}

export function formatNewsDate(published: string | undefined): string | undefined {
	if (!published || !/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(published)) return undefined
	const date = new Date(published)
	if (!Number.isFinite(date.getTime())) return undefined
	return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' })
}
