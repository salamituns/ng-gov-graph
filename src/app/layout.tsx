import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Geist_Mono, Hanken_Grotesk } from 'next/font/google'
import './globals.css'
import { getLang } from '@/lib/i18n-server'

// Body text: Hanken Grotesk. Headings and the wordmark: Bricolage Grotesque. Data labels stay in Geist Mono.
// Both need the "vietnamese" subset: it is where Google Fonts keeps the dot-below letters
// (ọ, ẹ, ị, ụ) that Yorùbá and Igbo are written with.
const body = Hanken_Grotesk({
	variable: '--font-body',
	subsets: ['latin', 'latin-ext', 'vietnamese'],
})

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
})

const display = Bricolage_Grotesque({
	variable: '--font-display',
	subsets: ['latin', 'latin-ext', 'vietnamese'],
})

// viewport-fit=cover lets the phone layout use env(safe-area-inset-*), so the floating brand bar clears the notch.
export const viewport: Viewport = {
	width: 'device-width',
	initialScale: 1,
	viewportFit: 'cover',
	colorScheme: 'light dark',
	// The browser chrome picks the one matching the system scheme; ThemeToggle keeps both in sync with the in-app theme.
	themeColor: [
		{ media: '(prefers-color-scheme: light)', color: '#e9ebe6' },
		{ media: '(prefers-color-scheme: dark)', color: '#151916' },
	],
}

export const metadata: Metadata = {
	// Links, previews and canonical URLs point at the site's own domain, not the vercel.app one.
	metadataBase: new URL('https://whoruns9ja.com'),
	openGraph: { siteName: 'Who Runs Naija', locale: 'en_NG', type: 'website' },
	title: 'Who Runs Naija · Nigeria’s government, mapped and sourced',
	applicationName: 'Who Runs Naija',
	appleWebApp: { title: 'Who Runs Naija' },
	description:
		'Who holds power in Nigeria, and who gave it to them: the Presidency, ministries, the National Assembly, the courts and the states, with every officeholder and every link sourced.',
}

const THEME_SCRIPT = `try{var t=localStorage.getItem('theme');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}`

export default async function RootLayout({ children }: LayoutProps<'/'>) {
	return (
		<html
			lang={await getLang()}
			className={`${body.variable} ${display.variable} ${geistMono.variable} h-full antialiased`}
			suppressHydrationWarning
		>
			<head>
				{/* Applies the saved or system theme before first paint so the map never flashes. */}
				<script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
			</head>
			<body className="min-h-full flex flex-col bg-background text-foreground">
				{children}
			</body>
		</html>
	)
}
