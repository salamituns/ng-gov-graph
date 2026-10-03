import posthog from 'posthog-js'

// Product analytics and the feedback inbox (PostHog). Off unless the project key is set, so local runs send nothing.
// Events go through /ingest on our own domain (rewritten in next.config.ts): ad blockers drop requests to posthog.com,
// and with them people's error reports.
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
if (key) {
	try {
		posthog.init(key, {
			api_host: '/ingest',
			ui_host: process.env.NEXT_PUBLIC_POSTHOG_UI_HOST ?? 'https://us.posthog.com',
			// Pageviews on client-side navigation, page leaves and autocaptured clicks, per PostHog's current defaults.
			defaults: '2026-08-30',
			// Anonymous visitors stay anonymous: no person profiles are created for them.
			person_profiles: 'identified_only',
			// Lean on purpose: pageviews, page leaves, web vitals and our named events (lib/track) answer the
			// questions; click autocapture would multiply events per visit and run past the free allowance.
			autocapture: false,
			// No replay recorder download: it costs visitors mobile data, and replay is off for the project.
			disable_session_recording: true,
			// Nor the surveys script: we don't run PostHog surveys (feedback has its own form).
			disable_surveys: true,
		})
	} catch {}
}
