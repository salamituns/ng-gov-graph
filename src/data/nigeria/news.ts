export interface NewsItem {
	id: string
	summary: string
	excerpt?: string
	url: string
	publication: string
	publishedAt?: string
	entityIds?: string[]
	/** The article's lead image, from the feed or the page's og:image. */
	imageUrl?: string
}

export const nigeriaNews: NewsItem[] = [
	{
		id: 'news-cabinet-reshuffle',
		summary:
			"<gov_entities='ng-ministry-of-finance'>Taiwo Oyedele</gov_entities> became Minister of Finance after a minor cabinet reshuffle that also moved Housing to Muttaqa Rabe Darma.",
		url: 'https://fmino.gov.ng/tinubu-approves-minor-cabinet-reshuffle-as-edun-dangiwa-leave-fec/',
		publication: 'Federal Ministry of Information',
	},
	{
		id: 'news-state-house-cabinet',
		summary:
			"The State House published the current Federal Executive Council list covering ministries from Defence to Livestock Development.",
		url: 'https://statehouse.gov.ng/the-cabinet/',
		publication: 'State House',
	},
	{
		id: 'news-nass',
		summary:
			"<gov_entities='ng-senate'>Senate President Godswill Akpabio</gov_entities> and <gov_entities='ng-house-of-representatives'>Speaker Tajudeen Abbas</gov_entities> continue to preside over the 10th National Assembly.",
		url: 'https://nass.gov.ng/',
		publication: 'National Assembly',
	},
]
