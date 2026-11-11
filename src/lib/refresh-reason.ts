/** Short cause text without queries, stacks, credentials or bearer secrets. */
export function reason(error: unknown): string {
	const cause = error instanceof Error && error.cause instanceof Error ? error.cause : error
	let message = cause instanceof Error ? cause.message : String(cause)
	for (const key of ['DATABASE_URL', 'CRON_SECRET', 'CF_API_TOKEN']) {
		const value = process.env[key]
		if (value) message = message.replaceAll(value, '[redacted]')
	}
	message = message.replace(/postgres(?:ql)?:\/\/\S+/gi, '[database]').replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
	const code = typeof cause === 'object' && cause && 'code' in cause ? ` (${String(cause.code)})` : ''
	return `${message.slice(0, 300)}${code}`
}
