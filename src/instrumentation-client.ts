import posthog from 'posthog-js'

// Product analytics and the feedback inbox (PostHog). Off unless the project key is set, so local runs send nothing.
// Lab browsers contact PostHog directly. The Vercel fallback uses the /ingest proxy.
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
if (key) {
	try {
		posthog.init(key, {
			api_host: process.env.NEXT_PUBLIC_LAB_BUILD === '1' ? (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com') : '/ingest',
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
