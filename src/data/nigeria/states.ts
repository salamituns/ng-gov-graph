import type { Catalog, EntitySpec } from '@/lib/graph/types'

const CONSTITUTION = 'https://www.constituteproject.org/constitution/Nigeria_2011'

interface StateRecord {
	slug: string
	name: string
	capital: string
	governor: string
	party: string
	year: number
	aliases?: string[]
}

const STATES: StateRecord[] = [
	{ slug: 'abia', name: 'Abia', capital: 'Umuahia', governor: 'Alex Otti', party: 'LP', year: 2023 },
	{ slug: 'adamawa', name: 'Adamawa', capital: 'Yola', governor: 'Ahmadu Umaru Fintiri', party: 'APC', year: 2019 },
	{ slug: 'akwa-ibom', name: 'Akwa Ibom', capital: 'Uyo', governor: 'Umo Eno', party: 'APC', year: 2023, aliases: ['AKS'] },
	{ slug: 'anambra', name: 'Anambra', capital: 'Awka', governor: 'Charles Soludo', party: 'APGA', year: 2022 },
	{ slug: 'bauchi', name: 'Bauchi', capital: 'Bauchi', governor: 'Bala Mohammed', party: 'APM', year: 2019 },
	{ slug: 'bayelsa', name: 'Bayelsa', capital: 'Yenagoa', governor: 'Douye Diri', party: 'APC', year: 2020 },
	{ slug: 'benue', name: 'Benue', capital: 'Makurdi', governor: 'Hyacinth Alia', party: 'APC', year: 2023 },
	{ slug: 'borno', name: 'Borno', capital: 'Maiduguri', governor: 'Babagana Zulum', party: 'APC', year: 2019 },
	{ slug: 'cross-river', name: 'Cross River', capital: 'Calabar', governor: 'Bassey Otu', party: 'APC', year: 2023 },
	{ slug: 'delta', name: 'Delta', capital: 'Asaba', governor: 'Sheriff Oborevwori', party: 'APC', year: 2023 },
	{ slug: 'ebonyi', name: 'Ebonyi', capital: 'Abakaliki', governor: 'Francis Nwifuru', party: 'APC', year: 2023 },
	{ slug: 'edo', name: 'Edo', capital: 'Benin City', governor: 'Monday Okpebholo', party: 'APC', year: 2024 },
	{ slug: 'ekiti', name: 'Ekiti', capital: 'Ado-Ekiti', governor: 'Biodun Oyebanji', party: 'APC', year: 2022 },
	{ slug: 'enugu', name: 'Enugu', capital: 'Enugu', governor: 'Peter Mbah', party: 'APC', year: 2023 },
	{ slug: 'gombe', name: 'Gombe', capital: 'Gombe', governor: 'Muhammad Inuwa Yahaya', party: 'APC', year: 2019 },
	{ slug: 'imo', name: 'Imo', capital: 'Owerri', governor: 'Hope Uzodinma', party: 'APC', year: 2020 },
	{ slug: 'jigawa', name: 'Jigawa', capital: 'Dutse', governor: 'Umar Namadi', party: 'APC', year: 2023 },
	{ slug: 'kaduna', name: 'Kaduna', capital: 'Kaduna', governor: 'Uba Sani', party: 'APC', year: 2023 },
	{ slug: 'kano', name: 'Kano', capital: 'Kano', governor: 'Abba Kabir Yusuf', party: 'APC', year: 2023 },
	{ slug: 'katsina', name: 'Katsina', capital: 'Katsina', governor: 'Dikko Umaru Radda', party: 'APC', year: 2023 },
	{ slug: 'kebbi', name: 'Kebbi', capital: 'Birnin Kebbi', governor: 'Nasir Idris', party: 'APC', year: 2023 },
	{ slug: 'kogi', name: 'Kogi', capital: 'Lokoja', governor: 'Ahmed Usman Ododo', party: 'APC', year: 2024 },
	{ slug: 'kwara', name: 'Kwara', capital: 'Ilorin', governor: 'AbdulRahman AbdulRazaq', party: 'APC', year: 2019 },
	{ slug: 'lagos', name: 'Lagos', capital: 'Ikeja', governor: 'Babajide Sanwo-Olu', party: 'APC', year: 2019 },
	{ slug: 'nasarawa', name: 'Nasarawa', capital: 'Lafia', governor: 'Abdullahi Sule', party: 'APC', year: 2019 },
	{ slug: 'niger', name: 'Niger', capital: 'Minna', governor: 'Mohammed Umar Bago', party: 'APC', year: 2023 },
	{ slug: 'ogun', name: 'Ogun', capital: 'Abeokuta', governor: 'Dapo Abiodun', party: 'APC', year: 2019 },
	{ slug: 'ondo', name: 'Ondo', capital: 'Akure', governor: 'Lucky Aiyedatiwa', party: 'APC', year: 2023 },
	{ slug: 'osun', name: 'Osun', capital: 'Osogbo', governor: 'Ademola Adeleke', party: 'Accord', year: 2022 },
	{ slug: 'oyo', name: 'Oyo', capital: 'Ibadan', governor: 'Seyi Makinde', party: 'APM', year: 2019 },
	{ slug: 'plateau', name: 'Plateau', capital: 'Jos', governor: 'Caleb Mutfwang', party: 'APC', year: 2023 },
	{ slug: 'rivers', name: 'Rivers', capital: 'Port Harcourt', governor: 'Siminalayi Fubara', party: 'APC', year: 2023 },
	{ slug: 'sokoto', name: 'Sokoto', capital: 'Sokoto', governor: 'Ahmad Aliyu', party: 'APC', year: 2023 },
	{ slug: 'taraba', name: 'Taraba', capital: 'Jalingo', governor: 'Agbu Kefas', party: 'APC', year: 2023 },
	{ slug: 'yobe', name: 'Yobe', capital: 'Damaturu', governor: 'Mai Mala Buni', party: 'APC', year: 2019 },
	{ slug: 'zamfara', name: 'Zamfara', capital: 'Gusau', governor: 'Dauda Lawal', party: 'APC', year: 2023 },
]

function stateEntities(record: StateRecord): EntitySpec[] {
	const stateId = `ng-${record.slug}-state`
	const assemblyId = `ng-${record.slug}-house-of-assembly`
	const governorId = `ng-governor-of-${record.slug}`
	return [
		{
			id: stateId,
			name: `${record.name} State`,
			type: 'state',
			sector: 'executive',
			layer: 'state',
			description: `A federating state of the Federal Republic of Nigeria. Capital: ${record.capital}. The governor is elected under section 176 of the 1999 Constitution.`,
			legalSourceUrl: `${CONSTITUTION}#s176`,
			aliases: [record.name, ...(record.aliases ?? [])],
			head: {
				id: governorId,
				title: `Governor of ${record.name} State`,
				person: {
					name: record.governor,
					party: record.party,
					appointedYear: record.year,
				},
			},
		},
		{
			id: assemblyId,
			name: `${record.name} State House of Assembly`,
			type: 'elected',
			sector: 'legislative',
			layer: 'state',
			parentId: stateId,
			description: `The unicameral legislature of ${record.name} State, established under section 90 of the Constitution.`,
			legalSourceUrl: `${CONSTITUTION}#s90`,
			aliases: [`${record.name} Assembly`],
		},
	]
}

const fct: EntitySpec = {
	id: 'ng-fct',
	name: 'Federal Capital Territory',
	type: 'state',
	sector: 'executive',
	layer: 'state',
	description:
		'The Federal Capital Territory is not a state. It is administered by a minister appointed by the President, not an elected governor.',
	legalSourceUrl: `${CONSTITUTION}#s297`,
	officialUrl: 'https://www.fcda.gov.ng/',
	aliases: ['FCT', 'Abuja'],
	head: {
		id: 'ng-fct-minister-seat',
		title: 'Minister of the Federal Capital Territory',
		person: {
			name: 'Nyesom Wike',
			party: 'APC',
			appointedYear: 2023,
		},
		appointedBy: 'ng-president',
		confirmedBy: 'ng-senate',
	},
}

export const nigeriaStatesCatalog: Catalog = {
	id: 'ng-states',
	name: 'Nigerian states',
	constituency: {
		id: 'ng-people',
		name: 'People of Nigeria',
		description: 'The sovereign people of the Federal Republic of Nigeria.',
	},
	entities: [...STATES.flatMap(stateEntities), fct],
	elects: [
		...STATES.map((record) => ({
			fromId: 'ng-people',
			toId: `ng-governor-of-${record.slug}`,
		})),
		...STATES.map((record) => ({
			fromId: 'ng-people',
			toId: `ng-${record.slug}-house-of-assembly`,
		})),
	],
	oversees: [
		...STATES.map((record) => ({
			fromId: `ng-${record.slug}-state`,
			toId: `ng-${record.slug}-house-of-assembly`,
		})),
		{ fromId: 'ng-ministry-of-fct', toId: 'ng-fct' },
	],
}
