import type { Metadata } from 'next'
import { Bricolage_Grotesque, Geist_Mono, Instrument_Sans } from 'next/font/google'
import './globals.css'

// Body text: Instrument Sans. Headings and the wordmark: Bricolage Grotesque. Data labels stay in Geist Mono.
const body = Instrument_Sans({
	variable: '--font-body',
	subsets: ['latin', 'latin-ext'],
})

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
})

const display = Bricolage_Grotesque({
	variable: '--font-display',
	subsets: ['latin', 'latin-ext'],
})

export const metadata: Metadata = {
	title: 'Who Runs Naija · Nigeria’s government, mapped and sourced',
	applicationName: 'Who Runs Naija',
	appleWebApp: { title: 'Who Runs Naija' },
	description:
		'Who holds power in Nigeria, and who gave it to them: the Presidency, ministries, the National Assembly, the courts and the states, with every officeholder and every link sourced.',
}

const THEME_SCRIPT = `try{var t=localStorage.getItem('theme');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}`

export default function RootLayout({ children }: LayoutProps<'/'>) {
	return (
		<html
			lang="en"
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
