import type { Catalog, EntitySpec, SeatSpec } from '@/lib/graph/types'
import { houseDistrictSeats, senateDistrictSeats } from '@/data/nigeria/nass'

const CONSTITUTION = 'https://www.constituteproject.org/constitution/Nigeria_2011'
const CABINET = 'https://statehouse.gov.ng/the-cabinet/'

function seat(
	id: string,
	title: string,
	person: SeatSpec['person'],
	opts?: Pick<SeatSpec, 'appointedBy' | 'confirmedBy'>,
): SeatSpec {
	return {
		id,
		title,
		person,
		appointedBy: opts?.appointedBy ?? 'ng-president',
		confirmedBy: opts?.confirmedBy ?? 'ng-senate',
	}
}

function ministry(spec: {
	id: string
	name: string
	description: string
	officialUrl?: string
	aliases?: string[]
	parentId?: string
	head: SeatSpec
	extraSeats?: SeatSpec[]
}): EntitySpec {
	return {
		type: 'department',
		sector: 'executive',
		legalSourceUrl: `${CONSTITUTION}#s147`,
		officialUrl: spec.officialUrl ?? CABINET,
		...spec,
	}
}

const ministries: EntitySpec[] = [
	ministry({
		id: 'ng-ministry-of-art-culture-tourism',
		name: 'Federal Ministry of Art, Culture, Tourism and the Creative Economy',
		description: 'Federal policy for arts, culture, tourism, and the creative economy.',
		head: seat('ng-minister-of-art-culture-tourism', 'Honourable Minister', {
			name: 'Hannatu Musa Musawa',
			appointedYear: 2023,
		}),
	}),
	ministry({
		id: 'ng-ministry-of-defence',
		name: 'Ministry of Defence',
		description: 'Civilian control of the Nigerian Armed Forces and defence policy.',
		officialUrl: 'https://defence.gov.ng/',
		aliases: ['MOD'],
		head: seat('ng-minister-of-defence', 'Honourable Minister of Defence', {
			name: 'Christopher Gwabin Musa',
			appointedYear: 2025,
		}),
		extraSeats: [
			seat('ng-minister-of-state-defence', 'Honourable Minister of State for Defence', {
				name: 'Bello Mohammed Matawalle',
				appointedYear: 2023,
			}),
		],
	}),
	ministry({
		id: 'ng-ministry-of-humanitarian-affairs',
		name: 'Federal Ministry of Humanitarian Affairs and Poverty Reduction',
		description: 'Federal humanitarian response and poverty-reduction programmes.',
		head: seat('ng-minister-of-humanitarian-affairs', 'Honourable Minister', {
			name: 'Bernard M. Doro',
			appointedYear: 2024,
		}),
		extraSeats: [
			seat('ng-minister-of-state-humanitarian-affairs', 'Honourable Minister of State', {
				name: 'Yusuf T. Sununu',
				appointedYear: 2023,
			}),
		],
	}),
	ministry({
		id: 'ng-ministry-of-agriculture',
		name: 'Federal Ministry of Agriculture and Food Security',
		description: 'Agriculture, food production, and food-security policy.',
		aliases: ['FMAFS'],
		head: seat('ng-minister-of-agriculture', 'Honourable Minister', {
			name: 'Abubakar Kyari',
			appointedYear: 2023,
		}),
		extraSeats: [
			seat('ng-minister-of-state-agriculture', 'Honourable Minister of State', {
				name: 'Aliyu Sabi Abdullahi',
				appointedYear: 2023,
			}),
		],
	}),
	ministry({
		id: 'ng-ministry-of-housing',
		name: 'Federal Ministry of Housing and Urban Development',
		description: 'Housing delivery and urban development.',
		head: seat('ng-minister-of-housing', 'Honourable Minister', {
			name: 'Muttaqa Rabe Darma',
			appointedYear: 2026,
		}),
		extraSeats: [
			seat('ng-minister-of-state-housing', 'Honourable Minister of State', {
				name: 'Yusuf Abdullahi Atah',
				appointedYear: 2024,
			}),
		],
	}),
	ministry({
		id: 'ng-ministry-of-labour',
		name: 'Federal Ministry of Labour and Employment',
		description: 'Labour standards, industrial relations, and employment.',
		head: seat('ng-minister-of-labour', 'Honourable Minister', {
			name: 'Muhammadu Maigari Dingyadi',
			appointedYear: 2024,
		}),
		extraSeats: [
			seat('ng-minister-of-state-labour', 'Honourable Minister of State', {
				name: 'Nkiruka Onyejeocha',
				appointedYear: 2023,
			}),
		],
	}),
	ministry({
		id: 'ng-ministry-of-budget',
		name: 'Federal Ministry of Budget and Economic Planning',
		description: 'National budget formulation and economic planning.',
		head: seat('ng-minister-of-budget', 'Honourable Minister', {
			name: 'Abubakar Atiku Bagudu',
			appointedYear: 2023,
		}),
		extraSeats: [
			seat('ng-minister-of-state-budget', 'Honourable Minister of State', {
				name: 'Doris Uzoka-Anite',
				appointedYear: 2023,
			}),
		],
	}),
	ministry({
		id: 'ng-ministry-of-health',
		name: 'Federal Ministry of Health and Social Welfare',
		description: 'National health system, public health, and social welfare.',
		officialUrl: 'https://www.health.gov.ng/',
		aliases: ['FMOH'],
		head: seat('ng-minister-of-health', 'Coordinating Minister of Health and Social Welfare', {
			name: 'Muhammad Ali Pate',
			appointedYear: 2023,
		}),
		extraSeats: [
			seat('ng-minister-of-state-health', 'Honourable Minister of State', {
				name: 'Iziaq Adekunle Salako',
				appointedYear: 2023,
			}),
		],
	}),
	ministry({
		id: 'ng-ministry-of-education',
		name: 'Federal Ministry of Education',
		description: 'Federal education policy from basic to tertiary.',
		officialUrl: 'https://education.gov.ng/',
		head: seat('ng-minister-of-education', 'Honourable Minister', {
			name: 'Maruf Tunji Alausa',
			appointedYear: 2024,
		}),
		extraSeats: [
			seat('ng-minister-of-state-education', 'Honourable Minister of State', {
				name: 'Suwaiba Said Ahmad',
				appointedYear: 2024,
			}),
		],
	}),
	ministry({
		id: 'ng-ministry-of-interior',
		name: 'Ministry of Interior',
		description: 'Internal security support, immigration, and correctional services.',
		head: seat('ng-minister-of-interior', 'Honourable Minister', {
			name: 'Olubunmi Tunji-Ojo',
			appointedYear: 2023,
		}),
	}),
	ministry({
		id: 'ng-ministry-of-foreign-affairs',
		name: 'Ministry of Foreign Affairs',
		description: 'Nigeria’s diplomatic service and foreign policy.',
		officialUrl: 'https://foreignaffairs.gov.ng/',
		aliases: ['MFA'],
		head: seat('ng-minister-of-foreign-affairs', 'Honourable Minister', {
			name: 'Bianca Odumegwu-Ojukwu',
			appointedYear: 2024,
		}),
		extraSeats: [
			seat('ng-minister-of-state-foreign-affairs', 'Honourable Minister of State', {
				name: 'Sola Enikanolaiye',
				appointedYear: 2024,
			}),
		],
	}),
	ministry({
		id: 'ng-ministry-of-fct',
		name: 'Ministry of the Federal Capital Territory',
		description: 'Administration of the Federal Capital Territory, Abuja.',
		aliases: ['FCTA', 'FCT'],
		head: seat('ng-minister-of-fct', 'Honourable Minister of the FCT', {
			name: 'Nyesom Wike',
			appointedYear: 2023,
			party: 'PDP',
		}),
		extraSeats: [
			seat('ng-minister-of-state-fct', 'Honourable Minister of State', {
				name: 'Mahmoud Mairiga',
				appointedYear: 2023,
			}),
		],
	}),
	ministry({
		id: 'ng-ministry-of-water-resources',
		name: 'Federal Ministry of Water Resources and Sanitation',
		description: 'Water resources, dams, and sanitation.',
		head: seat('ng-minister-of-water-resources', 'Honourable Minister', {
			name: 'Joseph Terlumun Utsev',
			appointedYear: 2023,
		}),
	}),
	ministry({
		id: 'ng-ministry-of-works',
		name: 'Federal Ministry of Works',
		description: 'Federal highways and public works infrastructure.',
		head: seat('ng-minister-of-works', 'Honourable Minister', {
			name: 'David Umahi',
			appointedYear: 2023,
		}),
		extraSeats: [
			seat('ng-minister-of-state-works', 'Honourable Minister of State', {
				name: 'Bello Muhammad Goronyo',
				appointedYear: 2023,
			}),
		],
	}),
	ministry({
		id: 'ng-ministry-of-industry',
		name: 'Federal Ministry of Industry, Trade and Investment',
		description: 'Industrial policy, trade, and investment promotion.',
		aliases: ['FMITI'],
		head: seat('ng-minister-of-industry', 'Honourable Minister', {
			name: 'Jumoke Oduwole',
			appointedYear: 2024,
		}),
		extraSeats: [
			seat('ng-minister-of-state-industry', 'Honourable Minister of State', {
				name: 'John Owan Enoh',
				appointedYear: 2023,
			}),
		],
	}),
	ministry({
		id: 'ng-ministry-of-women-affairs',
		name: 'Federal Ministry of Women Affairs',
		description: 'Gender policy and women’s development.',
		head: seat('ng-minister-of-women-affairs', 'Honourable Minister', {
			name: 'Imaan Sulaiman-Ibrahim',
			appointedYear: 2024,
		}),
	}),
	ministry({
		id: 'ng-ministry-of-steel',
		name: 'Ministry of Steel Development',
		description: 'Steel industry development and related minerals processing.',
		head: seat('ng-minister-of-steel', 'Honourable Minister', {
			name: 'Shuaibu Abubakar Audu',
			appointedYear: 2023,
		}),
	}),
	ministry({
		id: 'ng-ministry-of-regional-development',
		name: 'Ministry of Regional Development',
		description: 'Coordinates regional development commissions.',
		head: seat('ng-minister-of-regional-development', 'Honourable Minister', {
			name: 'Abubakar Momoh',
			appointedYear: 2023,
		}),
		extraSeats: [
			seat('ng-minister-of-state-regional-development', 'Honourable Minister of State', {
				name: 'Uba Maigari Ahmadu',
				appointedYear: 2023,
			}),
		],
	}),
	ministry({
		id: 'ng-ministry-of-information',
		name: 'Federal Ministry of Information and National Orientation',
		description: 'Public communication and national orientation.',
		officialUrl: 'https://fmino.gov.ng/',
		head: seat('ng-minister-of-information', 'Honourable Minister', {
			name: 'Mohammed Idris',
			appointedYear: 2023,
		}),
	}),
	ministry({
		id: 'ng-ministry-of-justice',
		name: 'Federal Ministry of Justice',
		description: 'Chief law office of the federation. The minister is also Attorney-General.',
		officialUrl: 'https://www.justice.gov.ng/',
		aliases: ['FMOJ', 'AGF'],
		head: seat('ng-attorney-general', 'Attorney-General of the Federation and Minister of Justice', {
			name: 'Lateef Olasunkanmi Fagbemi',
			appointedYear: 2023,
		}),
	}),
	ministry({
		id: 'ng-ministry-of-special-duties',
		name: 'Federal Ministry of Special Duties and Inter-Governmental Affairs',
		description: 'Special assignments and inter-governmental coordination.',
		head: seat('ng-minister-of-special-duties', 'Honourable Minister', {
			name: 'Zephaniah Bitrus Jisalo',
			appointedYear: 2023,
		}),
	}),
	ministry({
		id: 'ng-ministry-of-communications',
		name: 'Federal Ministry of Communications, Innovation and Digital Economy',
		description: 'Digital economy, communications, and innovation policy.',
		aliases: ['FMCIDE'],
		head: seat('ng-minister-of-communications', 'Honourable Minister', {
			name: 'Bosun Tijani',
			appointedYear: 2023,
		}),
	}),
	ministry({
		id: 'ng-ministry-of-finance',
		name: 'Federal Ministry of Finance',
		description: 'Public finance, fiscal policy, and coordinating minister of the economy.',
		officialUrl: 'https://www.finance.gov.ng/',
		aliases: ['FMF'],
		head: seat('ng-minister-of-finance', 'Minister of Finance and Coordinating Minister of the Economy', {
			name: 'Taiwo Oyedele',
			appointedYear: 2026,
		}),
		extraSeats: [
			seat('ng-minister-of-state-finance', 'Honourable Minister of State for Finance', null),
		],
	}),
	ministry({
		id: 'ng-ministry-of-marine',
		name: 'Federal Ministry of Marine and Blue Economy',
		description: 'Ports, shipping, and the blue economy.',
		head: seat('ng-minister-of-marine', 'Honourable Minister', {
			name: 'Adegboyega Oyetola',
			appointedYear: 2023,
		}),
	}),
	ministry({
		id: 'ng-ministry-of-power',
		name: 'Federal Ministry of Power',
		description: 'Electric power policy and the national grid.',
		head: seat('ng-minister-of-power', 'Honourable Minister', {
			name: 'Joseph Olasunkanmi Tegbe',
			appointedYear: 2024,
		}),
	}),
	ministry({
		id: 'ng-ministry-of-solid-minerals',
		name: 'Ministry of Solid Minerals Development',
		description: 'Solid minerals policy and mining regulation.',
		head: seat('ng-minister-of-solid-minerals', 'Honourable Minister', {
			name: 'Oladele Henry Alake',
			appointedYear: 2023,
		}),
	}),
	ministry({
		id: 'ng-ministry-of-transportation',
		name: 'Federal Ministry of Transportation',
		description: 'Rail, road transport policy, and related infrastructure.',
		head: seat('ng-minister-of-transportation', 'Honourable Minister', {
			name: "Sa'idu Alkali",
			appointedYear: 2023,
		}),
	}),
	ministry({
		id: 'ng-ministry-of-science',
		name: 'Federal Ministry of Innovation, Science and Technology',
		description: 'Science, technology, and innovation policy.',
		head: seat('ng-minister-of-science', 'Honourable Minister', {
			name: 'Kingsley T. Udeh',
			appointedYear: 2024,
		}),
	}),
	ministry({
		id: 'ng-ministry-of-aviation',
		name: 'Federal Ministry of Aviation and Aerospace Development',
		description: 'Civil aviation and aerospace development.',
		head: seat('ng-minister-of-aviation', 'Honourable Minister', {
			name: 'Festus Keyamo',
			appointedYear: 2023,
		}),
	}),
	ministry({
		id: 'ng-ministry-of-youth',
		name: 'Ministry of Youth Development',
		description: 'Youth policy and national youth programmes.',
		head: seat('ng-minister-of-youth', 'Honourable Minister', {
			name: 'Ayodele Olawande',
			appointedYear: 2023,
		}),
	}),
	ministry({
		id: 'ng-ministry-of-petroleum',
		name: 'Ministry of Petroleum Resources',
		description: 'Petroleum policy. The President concurrently holds the ministerial portfolio; ministers of state cover oil and gas.',
		aliases: ['MPR'],
		head: seat(
			'ng-minister-of-petroleum',
			'Minister of Petroleum Resources',
			{ name: 'Bola Ahmed Tinubu', appointedYear: 2023, party: 'APC' },
			{ appointedBy: 'ng-president', confirmedBy: undefined },
		),
		extraSeats: [
			seat('ng-minister-of-state-oil', 'Honourable Minister of State (Oil)', {
				name: 'Heineken Lokpobiri',
				appointedYear: 2023,
			}),
			seat('ng-minister-of-state-gas', 'Honourable Minister of State (Gas)', {
				name: 'Ekperikpe Ekpo',
				appointedYear: 2023,
			}),
		],
	}),
	ministry({
		id: 'ng-ministry-of-environment',
		name: 'Federal Ministry of Environment',
		description: 'Environment, climate, and conservation policy.',
		head: seat('ng-minister-of-environment', 'Honourable Minister', {
			name: 'Balarabe Abbas Lawal',
			appointedYear: 2023,
		}),
	}),
	ministry({
		id: 'ng-ministry-of-livestock',
		name: 'Ministry of Livestock Development',
		description: 'Livestock production and pastoral development.',
		head: seat('ng-minister-of-livestock', 'Honourable Minister', {
			name: 'Idi Mukhtar Maiha',
			appointedYear: 2024,
		}),
	}),
]

const core: EntitySpec[] = [
	{
		id: 'ng-president',
		name: 'President of the Federal Republic of Nigeria',
		type: 'elected',
		sector: 'executive',
		description: 'Head of state, head of government, and commander-in-chief of the armed forces under section 130 of the 1999 Constitution.',
		legalSourceUrl: `${CONSTITUTION}#s130`,
		officialUrl: 'https://statehouse.gov.ng/',
		aliases: ['President', 'GCFR', 'C-in-C'],
		head: {
			id: 'ng-office-of-the-president',
			title: 'President',
			person: { name: 'Bola Ahmed Tinubu', appointedYear: 2023, party: 'APC' },
		},
	},
	{
		id: 'ng-vice-president',
		name: 'Vice President of the Federal Republic of Nigeria',
		type: 'elected',
		sector: 'executive',
		description: 'Deputy to the President and successor under the Constitution.',
		legalSourceUrl: `${CONSTITUTION}#s141`,
		officialUrl: 'https://statehouse.gov.ng/',
		aliases: ['VP'],
		head: {
			id: 'ng-office-of-the-vice-president',
			title: 'Vice President',
			person: { name: 'Kashim Shettima', appointedYear: 2023, party: 'APC' },
		},
	},
	{
		id: 'ng-office-of-sgf',
		name: 'Office of the Secretary to the Government of the Federation',
		type: 'department',
		sector: 'executive',
		description: 'Cabinet secretariat and coordination of federal government business.',
		legalSourceUrl: `${CONSTITUTION}#s171`,
		officialUrl: 'https://www.osgf.gov.ng/',
		parentId: 'ng-president',
		aliases: ['SGF', 'OSGF'],
		head: seat('ng-secretary-to-the-government', 'Secretary to the Government of the Federation', {
			name: 'George Akume',
			appointedYear: 2023,
		}),
	},
	{
		id: 'ng-office-of-chief-of-staff',
		name: 'Office of the Chief of Staff to the President',
		type: 'department',
		sector: 'executive',
		description: 'Manages the President’s office, access, and agenda.',
		legalSourceUrl: `${CONSTITUTION}#s171`,
		aliases: ['CoS'],
		head: {
			id: 'ng-chief-of-staff',
			title: 'Chief of Staff to the President',
			person: { name: 'Femi Gbajabiamila', appointedYear: 2023, party: 'APC' },
			appointedBy: 'ng-president',
		},
	},
	{
		id: 'ng-national-assembly',
		name: 'National Assembly',
		type: 'elected',
		sector: 'legislative',
		description: 'Bicameral federal legislature: the Senate and the House of Representatives.',
		legalSourceUrl: `${CONSTITUTION}#s47`,
		officialUrl: 'https://nass.gov.ng/',
		aliases: ['NASS'],
	},
	{
		id: 'ng-senate',
		name: 'Senate of Nigeria',
		type: 'elected',
		sector: 'legislative',
		description: 'The Red Chamber. 109 senators, three from each state and one from the FCT. Confirms ministerial and other nominations.',
		legalSourceUrl: `${CONSTITUTION}#s48`,
		officialUrl: 'https://nass.gov.ng/',
		parentId: 'ng-national-assembly',
		aliases: ['Red Chamber'],
		head: {
			id: 'ng-president-of-the-senate',
			title: 'President of the Senate',
			person: { name: 'Godswill Akpabio', appointedYear: 2023, party: 'APC' },
		},
		extraSeats: [
			{
				id: 'ng-deputy-president-of-the-senate',
				title: 'Deputy President of the Senate',
				person: { name: 'Jibrin Barau', appointedYear: 2023, party: 'APC' },
			},
			...senateDistrictSeats,
		],
	},
	{
		id: 'ng-house-of-representatives',
		name: 'House of Representatives',
		type: 'elected',
		sector: 'legislative',
		description: 'The Green Chamber. 360 members elected from federal constituencies.',
		legalSourceUrl: `${CONSTITUTION}#s49`,
		officialUrl: 'https://nass.gov.ng/',
		parentId: 'ng-national-assembly',
		aliases: ['Green Chamber', 'HoR'],
		head: {
			id: 'ng-speaker',
			title: 'Speaker of the House of Representatives',
			person: { name: 'Tajudeen Abbas', appointedYear: 2023, party: 'APC' },
		},
		extraSeats: [
			{
				id: 'ng-deputy-speaker',
				title: 'Deputy Speaker of the House of Representatives',
				person: { name: 'Benjamin Kalu', appointedYear: 2023, party: 'APC' },
			},
			...houseDistrictSeats,
		],
	},
	{
		id: 'ng-supreme-court',
		name: 'Supreme Court of Nigeria',
		type: 'court',
		sector: 'judicial',
		description: 'Apex court of the federation.',
		legalSourceUrl: `${CONSTITUTION}#s230`,
		officialUrl: 'https://supremecourt.gov.ng/',
		aliases: ['SCN'],
		head: seat('ng-chief-justice', 'Chief Justice of Nigeria', {
			name: 'Kudirat Kekere-Ekun',
			appointedYear: 2024,
		}),
	},
	{
		id: 'ng-court-of-appeal',
		name: 'Court of Appeal',
		type: 'court',
		sector: 'judicial',
		description: 'Intermediate appellate court of the federation.',
		legalSourceUrl: `${CONSTITUTION}#s237`,
		head: seat('ng-president-court-of-appeal', 'President of the Court of Appeal', {
			name: 'Monica Dongban-Mensem',
			appointedYear: 2020,
		}),
	},
	{
		id: 'ng-federal-high-court',
		name: 'Federal High Court',
		type: 'court',
		sector: 'judicial',
		description: 'Court of first instance for specified federal causes.',
		legalSourceUrl: `${CONSTITUTION}#s249`,
		head: seat('ng-chief-judge-federal-high-court', 'Chief Judge of the Federal High Court', {
			name: 'John Tsoho',
			appointedYear: 2021,
		}),
	},
	{
		id: 'ng-national-industrial-court',
		name: 'National Industrial Court of Nigeria',
		type: 'court',
		sector: 'judicial',
		description: 'Superior court of record with exclusive jurisdiction over labour, employment, trade union and industrial relations matters.',
		legalSourceUrl: `${CONSTITUTION}#s254A`,
		aliases: ['NICN', 'National Industrial Court'],
	},
	{
		id: 'ng-fct-high-court',
		name: 'High Court of the Federal Capital Territory',
		type: 'court',
		sector: 'judicial',
		description: 'Superior court of record for the Federal Capital Territory, Abuja, with general civil and criminal jurisdiction.',
		legalSourceUrl: `${CONSTITUTION}#s255`,
		aliases: ['FCT High Court'],
	},
	{
		id: 'ng-fjsc',
		name: 'Federal Judicial Service Commission',
		type: 'commission',
		sector: 'judicial',
		description: 'Advises the National Judicial Council on nominations to federal judicial offices and appoints and disciplines the staff of federal courts.',
		legalSourceUrl: `${CONSTITUTION}#s153`,
		aliases: ['FJSC'],
	},
	{
		id: 'ng-clerk-to-the-national-assembly',
		name: 'Office of the Clerk to the National Assembly',
		type: 'department',
		sector: 'legislative',
		parentId: 'ng-national-assembly',
		description: 'The administrative head of the National Assembly bureaucracy. The Constitution provides for a Clerk and such other staff as an Act of the National Assembly prescribes.',
		legalSourceUrl: `${CONSTITUTION}#s51`,
		officialUrl: 'https://nass.gov.ng/',
		aliases: ['CNA', 'Clerk to the National Assembly'],
	},
	{
		id: 'ng-njc',
		name: 'National Judicial Council',
		type: 'commission',
		sector: 'judicial',
		description: 'Recommends judicial appointments and exercises disciplinary control over judicial officers.',
		legalSourceUrl: `${CONSTITUTION}#s153`,
		aliases: ['NJC'],
		head: {
			id: 'ng-njc-chair',
			title: 'Chairman of the National Judicial Council',
			person: { name: 'Kudirat Kekere-Ekun', appointedYear: 2024 },
		},
	},
	{
		id: 'ng-inec',
		name: 'Independent National Electoral Commission',
		type: 'commission',
		sector: 'independent',
		description: 'Conducts federal and state elections and voter registration.',
		legalSourceUrl: `${CONSTITUTION}#s153`,
		officialUrl: 'https://www.inecnigeria.org/',
		aliases: ['INEC'],
		head: seat('ng-inec-chairman', 'Chairman of INEC', {
			name: 'Joash Amupitan',
			appointedYear: 2025,
		}),
	},
	{
		id: 'ng-cbn',
		name: 'Central Bank of Nigeria',
		type: 'corporation',
		sector: 'independent',
		description: 'The bankers’ bank. Issues the naira and conducts monetary policy.',
		legalSourceUrl: 'https://www.cbn.gov.ng/',
		officialUrl: 'https://www.cbn.gov.ng/',
		aliases: ['CBN'],
		head: seat('ng-cbn-governor', 'Governor of the Central Bank of Nigeria', {
			name: 'Olayemi Cardoso',
			appointedYear: 2023,
		}),
	},
	{
		id: 'ng-efcc',
		name: 'Economic and Financial Crimes Commission',
		type: 'commission',
		sector: 'independent',
		description: 'Investigates and prosecutes economic and financial crimes.',
		legalSourceUrl: 'https://www.efcc.gov.ng/',
		officialUrl: 'https://www.efcc.gov.ng/',
		aliases: ['EFCC'],
		head: seat('ng-efcc-chairman', 'Executive Chairman of the EFCC', {
			name: 'Ola Olukoyede',
			appointedYear: 2023,
		}),
	},
	{
		id: 'ng-icpc',
		name: 'Independent Corrupt Practices and Other Related Offences Commission',
		type: 'commission',
		sector: 'independent',
		description: 'Prevents and prosecutes corruption in the public service.',
		legalSourceUrl: 'https://icpc.gov.ng/',
		officialUrl: 'https://icpc.gov.ng/',
		aliases: ['ICPC'],
		head: seat('ng-icpc-chairman', 'Chairman of the ICPC', {
			name: 'Musa Adamu Aliyu',
			appointedYear: 2023,
		}),
	},
	{
		id: 'ng-police',
		name: 'Nigeria Police Force',
		type: 'department',
		sector: 'executive',
		description: 'The national police. The Inspector-General is appointed by the President on the advice of the Police Council.',
		legalSourceUrl: `${CONSTITUTION}#s214`,
		officialUrl: 'https://www.npf.gov.ng/',
		aliases: ['NPF', 'IGP'],
		parentId: 'ng-ministry-of-interior',
		head: seat('ng-inspector-general-of-police', 'Inspector-General of Police', {
			name: 'Olatunji Disu',
			appointedYear: 2026,
		}),
	},
	{
		id: 'ng-armed-forces',
		name: 'Nigerian Armed Forces',
		type: 'department',
		sector: 'executive',
		description: 'Army, Navy, and Air Force under civilian control of the Ministry of Defence.',
		legalSourceUrl: `${CONSTITUTION}#s217`,
		parentId: 'ng-ministry-of-defence',
		aliases: ['NAF', 'Defence'],
		head: {
			id: 'ng-chief-of-defence-staff',
			title: 'Chief of Defence Staff',
			person: { name: 'Olufemi Oluyede', appointedYear: 2024 },
			appointedBy: 'ng-president',
		},
	},
	{
		id: 'ng-nnpc',
		name: 'NNPC Limited',
		type: 'corporation',
		sector: 'executive',
		description: 'The incorporated national petroleum company.',
		legalSourceUrl: 'https://www.nnpcgroup.com/',
		officialUrl: 'https://www.nnpcgroup.com/',
		aliases: ['NNPC', 'NNPCL'],
		parentId: 'ng-ministry-of-petroleum',
		head: {
			id: 'ng-nnpc-gceo',
			title: 'Group Chief Executive Officer',
			person: { name: 'Bashir Bayo Ojulari', appointedYear: 2025 },
			appointedBy: 'ng-president',
		},
	},
	{
		id: 'ng-code-of-conduct-bureau',
		name: 'Code of Conduct Bureau',
		type: 'commission',
		sector: 'independent',
		description: 'Receives asset declarations from public officers.',
		legalSourceUrl: `${CONSTITUTION}#s153`,
		aliases: ['CCB'],
		head: seat('ng-ccb-chair', 'Chairman of the Code of Conduct Bureau', null),
	},
	{
		id: 'ng-federal-character-commission',
		name: 'Federal Character Commission',
		type: 'commission',
		sector: 'independent',
		description: 'Promotes equitable distribution of federal public-service positions among the states.',
		legalSourceUrl: `${CONSTITUTION}#s153`,
		aliases: ['FCC'],
		head: seat('ng-fcc-chair', 'Chairman of the Federal Character Commission', {
			name: 'Ayo Hulayat Omidiran',
			appointedYear: 2025,
		}),
	},
	{
		id: 'ng-national-population-commission',
		name: 'National Population Commission',
		type: 'commission',
		sector: 'independent',
		description: 'Census and demographic statistics.',
		legalSourceUrl: `${CONSTITUTION}#s153`,
		aliases: ['NPC'],
		head: seat('ng-npc-chair', 'Chairman of the National Population Commission', {
			name: 'Nasir Isa Kwarra',
			appointedYear: 2020,
		}),
	},
]

export const nigeriaCatalog: Catalog = {
	id: 'ng',
	name: 'Federal Republic of Nigeria',
	constituency: {
		id: 'ng-people',
		name: 'People of Nigeria',
		description: 'The sovereign people of the Federal Republic of Nigeria, from whom government derives its authority.',
	},
	entities: [...core, ...ministries],
	elects: [
		{ fromId: 'ng-people', toId: 'ng-president' },
		{ fromId: 'ng-people', toId: 'ng-vice-president' },
		{ fromId: 'ng-people', toId: 'ng-national-assembly' },
		{ fromId: 'ng-senate', toId: 'ng-president-of-the-senate' },
		{ fromId: 'ng-house-of-representatives', toId: 'ng-speaker' },
	],
	oversees: [
		{ fromId: 'ng-president', toId: 'ng-ministry-of-defence' },
		{ fromId: 'ng-president', toId: 'ng-ministry-of-finance' },
		{ fromId: 'ng-president', toId: 'ng-ministry-of-justice' },
		{ fromId: 'ng-president', toId: 'ng-ministry-of-petroleum' },
		{ fromId: 'ng-ministry-of-defence', toId: 'ng-armed-forces' },
		{ fromId: 'ng-ministry-of-interior', toId: 'ng-police' },
		{ fromId: 'ng-ministry-of-petroleum', toId: 'ng-nnpc' },
		{ fromId: 'ng-national-assembly', toId: 'ng-senate' },
		{ fromId: 'ng-national-assembly', toId: 'ng-house-of-representatives' },
		{ fromId: 'ng-supreme-court', toId: 'ng-court-of-appeal' },
		{ fromId: 'ng-njc', toId: 'ng-supreme-court' },
		{ fromId: 'ng-njc', toId: 'ng-national-industrial-court' },
		{ fromId: 'ng-njc', toId: 'ng-fct-high-court' },
		{ fromId: 'ng-njc', toId: 'ng-fjsc' },
	],
}
