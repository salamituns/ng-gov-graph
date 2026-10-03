import posthog from 'posthog-js'

/** Whether analytics is running in this browser (a key is configured and PostHog has loaded). */
export function trackingOn() {
	return Boolean(posthog.__loaded)
}

/** Records a named product event. A no-op when analytics is off, so callers never need to check. */
export function track(event: string, properties?: Record<string, unknown>) {
	if (!posthog.__loaded) return
	try {
		posthog.capture(event, properties)
	} catch {}
}
