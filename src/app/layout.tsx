import type { Metadata } from 'next'
import { Fraunces, Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
})

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
})

const fraunces = Fraunces({
	variable: '--font-fraunces',
	subsets: ['latin'],
})

export const metadata: Metadata = {
	title: 'Govgraph · Nigeria',
	description:
		'A public data model of the Federal Republic of Nigeria: branches, ministries, courts, commissions, and the legal relationships between them.',
}

const THEME_SCRIPT = `try{var t=localStorage.getItem('theme');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}`

export default function RootLayout({ children }: LayoutProps<'/'>) {
	return (
		<html
			lang="en"
			className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
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
