import { naira } from '@/data/nigeria/budget'

/** Personnel, overhead and capital as one bar. */
export function SpendBar({ personnel, overhead, capital, total }: { personnel: number; overhead: number; capital: number; total: number }) {
	const share = (value: number) => `${total > 0 ? Math.max(0, (value / total) * 100) : 0}%`
	return (
		<>
			<span className="spend-bar" aria-hidden="true">
				<span className="spend-personnel" style={{ width: share(personnel) }} />
				<span className="spend-overhead" style={{ width: share(overhead) }} />
				<span className="spend-capital" style={{ width: share(capital) }} />
			</span>
			<ul className="spend-key">
				<li><i className="spend-personnel" />Salaries {naira(personnel)}</li>
				<li><i className="spend-overhead" />Running costs {naira(overhead)}</li>
				<li><i className="spend-capital" />Projects {naira(capital)}</li>
			</ul>
		</>
	)
}
