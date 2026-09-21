import type { Catalog, EntitySpec } from '@/lib/graph/types'

const AGENCIES: Array<{
	id: string
	name: string
	description: string
	officialUrl: string
	parentId: string
	aliases?: string[]
}> = [
	{
		id: 'ng-firs',
		name: 'Federal Inland Revenue Service',
		description: 'Assesses and collects federal taxes other than customs and excise.',
		officialUrl: 'https://www.firs.gov.ng/',
		parentId: 'ng-ministry-of-finance',
		aliases: ['FIRS'],
	},
	{
		id: 'ng-customs',
		name: 'Nigeria Customs Service',
		description: 'Collects customs duties and controls goods entering and leaving Nigeria.',
		officialUrl: 'https://www.customs.gov.ng/',
		parentId: 'ng-ministry-of-finance',
		aliases: ['Customs'],
	},
	{
		id: 'ng-dmo',
		name: 'Debt Management Office',
		description: 'Manages the Federal Government public debt.',
		officialUrl: 'https://www.dmo.gov.ng/',
		parentId: 'ng-ministry-of-finance',
		aliases: ['DMO'],
	},
	{
		id: 'ng-nafdac',
		name: 'National Agency for Food and Drug Administration and Control',
		description: 'Regulates food, drugs, cosmetics, and related products.',
		officialUrl: 'https://nafdac.gov.ng/',
		parentId: 'ng-ministry-of-health',
		aliases: ['NAFDAC'],
	},
	{
		id: 'ng-ncdc',
		name: 'Nigeria Centre for Disease Control and Prevention',
		description: 'Leads the public-health response to infectious disease.',
		officialUrl: 'https://ncdc.gov.ng/',
		parentId: 'ng-ministry-of-health',
		aliases: ['NCDC'],
	},
	{
		id: 'ng-jamb',
		name: 'Joint Admissions and Matriculation Board',
		description: 'Conducts entrance examinations for tertiary admission.',
		officialUrl: 'https://www.jamb.gov.ng/',
		parentId: 'ng-ministry-of-education',
		aliases: ['JAMB'],
	},
	{
		id: 'ng-nuc',
		name: 'National Universities Commission',
		description: 'Regulates and accredits Nigerian universities.',
		officialUrl: 'https://www.nuc.edu.ng/',
		parentId: 'ng-ministry-of-education',
		aliases: ['NUC'],
	},
	{
		id: 'ng-ncc',
		name: 'Nigerian Communications Commission',
		description: 'Regulates telecommunications and the radio spectrum.',
		officialUrl: 'https://www.ncc.gov.ng/',
		parentId: 'ng-ministry-of-communications',
		aliases: ['NCC'],
	},
	{
		id: 'ng-nis',
		name: 'Nigeria Immigration Service',
		description: 'Controls entry, residence, and passports.',
		officialUrl: 'https://immigration.gov.ng/',
		parentId: 'ng-ministry-of-interior',
		aliases: ['NIS'],
	},
	{
		id: 'ng-nscdc',
		name: 'Nigeria Security and Civil Defence Corps',
		description: 'Protects critical infrastructure and supports civil defence.',
		officialUrl: 'https://nscdc.gov.ng/',
		parentId: 'ng-ministry-of-interior',
		aliases: ['NSCDC'],
	},
	{
		id: 'ng-nimasa',
		name: 'Nigerian Maritime Administration and Safety Agency',
		description: 'Regulates shipping, maritime safety, and security.',
		officialUrl: 'https://nimasa.gov.ng/',
		parentId: 'ng-ministry-of-marine',
		aliases: ['NIMASA'],
	},
	{
		id: 'ng-ncaa',
		name: 'Nigeria Civil Aviation Authority',
		description: 'Regulates civil aviation safety and economic oversight.',
		officialUrl: 'https://ncaa.gov.ng/',
		parentId: 'ng-ministry-of-aviation',
		aliases: ['NCAA'],
	},
	{
		id: 'ng-nerc',
		name: 'Nigerian Electricity Regulatory Commission',
		description: 'Licenses and regulates the electricity market.',
		officialUrl: 'https://nerc.gov.ng/',
		parentId: 'ng-ministry-of-power',
		aliases: ['NERC'],
	},
	{
		id: 'ng-ferma',
		name: 'Federal Roads Maintenance Agency',
		description: 'Maintains federal highways.',
		officialUrl: 'https://ferma.gov.ng/',
		parentId: 'ng-ministry-of-works',
		aliases: ['FERMA'],
	},
]

const entities: EntitySpec[] = AGENCIES.map((agency) => ({
	id: agency.id,
	name: agency.name,
	type: 'department',
	sector: 'executive',
	description: agency.description,
	legalSourceUrl: agency.officialUrl,
	officialUrl: agency.officialUrl,
	aliases: agency.aliases,
	parentId: agency.parentId,
}))

export const nigeriaAgenciesCatalog: Catalog = {
	id: 'ng-agencies',
	name: 'Federal parastatals',
	constituency: {
		id: 'ng-people',
		name: 'People of Nigeria',
		description: 'Unused. Merged into the federal catalog.',
	},
	entities,
	elects: [],
	oversees: AGENCIES.map((agency) => ({
		fromId: agency.parentId,
		toId: agency.id,
	})),
}
