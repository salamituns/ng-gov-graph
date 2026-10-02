/**
 * Civic topics for "Trending this week". A story belongs to a topic when its headline or excerpt has one of the
 * topic's keywords; the bodies are what the government map lights when the topic is opened.
 *
 * How keywords match:
 * - lowercase: the start of a word, in any case. "bandit" finds "bandits" and "Banditry"; "fuel price" finds
 *   "fuel prices".
 * - A Name with capitals: the whole word or phrase, in any case. "Dangote refinery" finds "Dangote Refinery".
 * - ACRONYMS in capitals: exactly, as a whole word. "VAT" never fires inside "private", nor "NIN" in "Nineteen".
 *
 * A headline match is enough; a match only in the excerpt needs two different keywords, because excerpts wander
 * (a fire report that mentions petrol is not about fuel prices).
 *
 * Keep keywords specific: a word that appears in unrelated stories ("attack", "price", "court of") makes a topic
 * trend for the wrong reasons.
 */
export interface CivicTopic {
	id: string
	label: string
	keywords: string[]
	/** Graph bodies lit on the map for this topic. */
	bodies: string[]
}

export const CIVIC_TOPICS: CivicTopic[] = [
	{
		id: 'fuel-prices',
		label: 'Fuel prices',
		keywords: ['petrol', 'fuel price', 'pump price', 'fuel scarcity', 'fuel subsidy', 'subsidy removal', 'filling station', 'Dangote refinery', 'PMS', 'CNG'],
		bodies: ['ng-nnpc', 'ng-nmdpra', 'ng-ministry-of-petroleum'],
	},
	{
		id: 'electricity',
		label: 'Electricity',
		keywords: ['electricity', 'power supply', 'national grid', 'grid collapse', 'blackout', 'Band A', 'DisCo', 'GenCo', 'NERC', 'meter'],
		bodies: ['ng-ministry-of-power', 'ng-nerc'],
	},
	{
		id: 'insecurity',
		label: 'Insecurity',
		keywords: ['insecurity', 'bandit', 'kidnap', 'abduct', 'terroris', 'Boko Haram', 'ISWAP', 'gunmen', 'insurgen', 'herders', 'Lakurawa'],
		bodies: ['ng-ministry-of-defence', 'ng-nigerian-army', 'ng-onsa', 'ng-police', 'ng-dss'],
	},
	{
		id: 'elections-2027',
		label: '2027 elections & parties',
		keywords: ['2027', 'primaries', 'primary election', 'gov primary', 'governorship primary', 'presidential primary', 'governorship election', 'aspirant', 'candidate', 'defect', 'running mate', 'INEC', 'campaign', 'APC', 'PDP', 'ADC', 'LP', 'NDC', 'SDP', 'APGA', 'NNPP'],
		bodies: ['ng-inec'],
	},
	{
		id: 'tax-reform',
		label: 'Tax reform',
		keywords: ['tax reform', 'tax bill', 'tax law', 'taxes', 'taxation', 'levy', 'levies', 'revenue service', 'VAT', 'FIRS', 'NRS'],
		bodies: ['ng-firs', 'ng-ministry-of-finance', 'ng-rmafc'],
	},
	{
		id: 'naira-inflation',
		label: 'Naira & inflation',
		keywords: ['naira', 'inflation', 'exchange rate', 'forex', 'interest rate', 'monetary policy', 'MPC', 'CBN', 'GDP', 'cost of living'],
		bodies: ['ng-cbn', 'ng-nbs', 'ng-ministry-of-finance'],
	},
	{
		id: 'budget-debt',
		label: 'Budget & debt',
		keywords: ['budget', 'appropriation', 'supplementary', 'borrowing', 'public debt', 'debt servic', 'Eurobond', 'loan request'],
		bodies: ['ng-ministry-of-budget', 'ng-ministry-of-finance', 'ng-national-assembly'],
	},
	{
		id: 'corruption',
		label: 'Corruption cases',
		keywords: ['corruption', 'fraud', 'money laundering', 'embezzl', 'misappropriat', 'arraign', 'asset declaration', 'EFCC', 'ICPC'],
		bodies: ['ng-efcc', 'ng-icpc', 'ng-code-of-conduct-bureau', 'ng-code-of-conduct-tribunal'],
	},
	{
		id: 'constitution-review',
		label: 'Constitution review',
		keywords: ['constitution review', 'constitutional amendment', 'constitution amendment', 'amend the constitution', 'state police bill', 'creation of state police', 'establishment of state police', 'local government autonomy', 'special seats'],
		bodies: ['ng-national-assembly', 'ng-senate', 'ng-house-of-representatives'],
	},
	{
		id: 'courts',
		label: 'Courts & rulings',
		keywords: ['Court', 'Supreme Court', 'Court of Appeal', 'Federal High Court', 'judgment', 'ruling', 'tribunal', 'NJC'],
		bodies: ['ng-supreme-court', 'ng-njc'],
	},
	{
		id: 'health',
		label: 'Health & outbreaks',
		keywords: ['outbreak', 'diphtheria', 'cholera', 'Lassa', 'meningitis', 'mpox', 'malaria', 'vaccin', 'hospitals', 'general hospital', 'teaching hospital', 'health insurance', 'primary health', 'NCDC', 'NHIA'],
		bodies: ['ng-ministry-of-health', 'ng-ncdc', 'ng-nphcda', 'ng-nhia'],
	},
	{
		id: 'education',
		label: 'Education',
		keywords: ['school', 'universit', 'student loan', 'out-of-school', 'lecturer', 'ASUU', 'JAMB', 'UTME', 'WAEC', 'NECO', 'TETFund', 'NELFUND'],
		bodies: ['ng-ministry-of-education', 'ng-jamb', 'ng-tetfund', 'ng-ubec'],
	},
	{
		id: 'wages-strikes',
		label: 'Wages & strikes',
		keywords: ['minimum wage', 'strike', 'industrial action', 'pension', 'salary arrears', 'unpaid salar', 'NLC', 'TUC'],
		bodies: ['ng-ministry-of-labour'],
	},
	{
		id: 'food-farming',
		label: 'Food & farming',
		keywords: ['food price', 'food inflation', 'food security', 'farmer', 'fertiliser', 'fertilizer', 'harvest', 'grain'],
		bodies: ['ng-ministry-of-agriculture', 'ng-boa'],
	},
	{
		id: 'oil-gas',
		label: 'Oil & gas',
		keywords: ['crude', 'oil theft', 'pipeline', 'oil production', 'upstream', 'gas flaring', 'flaring', 'oil spill', 'NUPRC', 'NNPC'],
		bodies: ['ng-nuprc', 'ng-nnpc', 'ng-ministry-of-petroleum'],
	},
	{
		id: 'floods-climate',
		label: 'Floods & climate',
		keywords: ['flood', 'erosion', 'climate', 'emission', 'deforestation', 'desertification', 'NEMA', 'NiMet'],
		bodies: ['ng-nema', 'ng-nihsa', 'ng-ministry-of-environment', 'ng-nesrea'],
	},
	{
		id: 'roads-transport',
		label: 'Roads & transport',
		keywords: ['highway', 'expressway', 'road construction', 'bad roads', 'bridge', 'railway', 'rail line', 'coastal road', 'transport fare', 'fares', 'FERMA'],
		bodies: ['ng-ministry-of-works', 'ng-ferma', 'ng-ministry-of-transportation', 'ng-nrc'],
	},
	{
		id: 'mining',
		label: 'Mining',
		keywords: ['mining', 'miners', 'solid minerals', 'lithium', 'gold mining', 'mineral'],
		bodies: ['ng-ministry-of-solid-minerals', 'ng-mco'],
	},
	{
		id: 'telecoms-digital',
		label: 'Telecoms & digital',
		keywords: ['telecom', 'data tariff', 'call tariff', 'broadband', 'internet', 'cybercrime', 'NCC', 'NIN', 'SIM', 'MTN', 'Airtel'],
		bodies: ['ng-ncc', 'ng-ministry-of-communications', 'ng-nitda'],
	},
	{
		id: 'jobs-investment',
		label: 'Jobs & investment',
		keywords: ['unemployment', 'job creation', 'jobs', 'investors', 'foreign direct investment', 'free zone', 'FDI'],
		bodies: ['ng-ministry-of-industry', 'ng-nbs'],
	},
	{
		id: 'humanitarian',
		label: 'Poverty & aid',
		keywords: ['cash transfer', 'palliative', 'poverty', 'displaced', 'IDP', 'humanitarian', 'social investment'],
		bodies: ['ng-ministry-of-humanitarian-affairs'],
	},
]
