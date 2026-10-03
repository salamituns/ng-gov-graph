'use client'

import { useRef, useState } from 'react'
import { X } from 'lucide-react'
import { track, trackingOn } from '@/lib/track'

type Kind = 'error' | 'feature'

const COPY: Record<Kind, { title: string; lead: (subject?: string) => string; placeholder: string }> = {
	error: {
		title: 'Spot an error?',
		lead: (subject) => `Tell us what’s wrong or out of date${subject ? ` about ${subject}` : ''}. We check every report against official sources.`,
		placeholder: 'e.g. A new minister was sworn in last week. Here’s the announcement: …',
	},
	feature: {
		title: 'Suggest a feature',
		lead: () => 'What would help you understand who runs Nigeria?',
		placeholder: 'e.g. Show my local government chairman',
	},
}

/**
 * A text button that opens a short form: what's wrong (or what you'd like), and an optional way to reply.
 * It goes to the PostHog project as a `feedback_submitted` event, so it works on phones without a mail app.
 */
export function FeedbackButton({ kind, label, subject, className }: { kind: Kind; label: string; subject?: { id: string; name: string }; className?: string }) {
	const dialog = useRef<HTMLDialogElement>(null)
	const [status, setStatus] = useState<'editing' | 'sent' | 'failed'>('editing')
	const copy = COPY[kind]

	const open = () => {
		setStatus('editing')
		dialog.current?.showModal()
	}
	const submit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		const form = new FormData(event.currentTarget)
		const message = String(form.get('message') ?? '').trim()
		if (!message) return
		if (!trackingOn()) {
			setStatus('failed')
			return
		}
		track('feedback_submitted', {
			kind,
			message,
			contact: String(form.get('contact') ?? '').trim() || undefined,
			subject_id: subject?.id,
			subject_name: subject?.name,
			page: window.location.pathname,
		})
		event.currentTarget.reset()
		setStatus('sent')
	}

	return (
		<>
			<button type="button" className={`feedback-trigger${className ? ` ${className}` : ''}`} onClick={open}>{label}</button>
			<dialog ref={dialog} className="feedback-dialog" aria-label={copy.title} onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close() }}>
				<header>
					<h2>{copy.title}</h2>
					<button type="button" aria-label="Close" onClick={() => dialog.current?.close()}><X size={18} /></button>
				</header>
				{status === 'sent' ? (
					<div className="feedback-done">
						<p>Thank you. We read every message.</p>
						<button type="button" onClick={() => dialog.current?.close()}>Close</button>
					</div>
				) : (
					<form onSubmit={submit}>
						<p className="feedback-lead">{copy.lead(subject?.name)}</p>
						<textarea name="message" required maxLength={1500} rows={4} placeholder={copy.placeholder} aria-label={copy.title} />
						<input name="contact" type="text" maxLength={120} autoComplete="email" placeholder="Email or X handle (optional)" aria-label="Your email or X handle, optional" />
						{status === 'failed' ? <p className="feedback-error" role="alert">Couldn’t send just now. Please try again in a moment.</p> : null}
						<button type="submit">Send</button>
					</form>
				)}
			</dialog>
		</>
	)
}
