import type { Catalog, EntitySpec, SeatSpec } from '@/lib/graph/types'

const CONSTITUTION = 'https://www.constituteproject.org/constitution/Nigeria_2011'
const S154 = 'section 154 of the Constitution'

export interface HeadSpec {
	title: string
	/** Senate confirmation, recorded only where the Constitution or the establishing Act requires it. */
	confirm?: boolean
	basis?: string
	by?: string
}

/** A head seat whose holder is not yet sourced: the appointment rule is law, the name comes later. */
export function headSeat(orgId: string, head: HeadSpec): SeatSpec {
	return {
		id: `${orgId}-head`,
		title: head.title,
		person: null,
		unrecorded: true,
		appointedBy: head.by ?? 'ng-president',
		confirmedBy: head.confirm ? 'ng-senate' : undefined,
		basis: head.basis,
	}
}

/** Who heads each existing parastatal and how they are appointed. */
export const AGENCY_HEADS: Record<string, HeadSpec> = {
	'ng-frsc': { title: 'Corps Marshal', basis: 'the Federal Road Safety Commission (Establishment) Act 2007' },
	'ng-naseni': { title: 'Executive Vice-Chairman' },
	'ng-boundary-commission': { title: 'Director-General' },
	'ng-hyppadec': { title: 'Managing Director' },
	'ng-bpsr': { title: 'Director-General' },
	'ng-naec': { title: 'Chairman and Chief Executive' },
	'ng-ncpc': { title: 'Executive Secretary' },
	'ng-servicom': { title: 'National Coordinator' },
	'ng-frc': { title: 'Chairman', basis: 'the Fiscal Responsibility Act 2007' },
	'ng-icrc': { title: 'Director-General' },
	'ng-neiti': { title: 'Executive Secretary', basis: 'the NEITI Act 2007' },
	'ng-bcda': { title: 'Executive Secretary' },
	'ng-nigerian-army': { title: 'Chief of Army Staff', basis: 'section 218 of the Constitution' },
	'ng-nigerian-navy': { title: 'Chief of the Naval Staff', basis: 'section 218 of the Constitution' },
	'ng-nigerian-air-force': { title: 'Chief of the Air Staff', basis: 'section 218 of the Constitution' },
	'ng-naqs': { title: 'Comptroller-General' },
	'ng-boa': { title: 'Managing Director' },
	'ng-naic': { title: 'Managing Director' },
	'ng-nasc': { title: 'Director-General' },
	'ng-armti': { title: 'Executive Director' },
	'ng-arcn': { title: 'Executive Secretary' },
	'ng-nias': { title: 'Registrar' },
	'ng-vcn': { title: 'Registrar' },
	'ng-niss': { title: 'Registrar' },
	'ng-nafdac': { title: 'Director-General', basis: 'the NAFDAC Act' },
	'ng-ncdc': { title: 'Director-General', basis: 'the NCDC (Establishment) Act 2018' },
	'ng-nhia': { title: 'Director-General', basis: 'the National Health Insurance Authority Act 2022' },
	'ng-nphcda': { title: 'Executive Director' },
	'ng-nimr': { title: 'Director-General' },
	'ng-niprd': { title: 'Director-General' },
	'ng-jamb': { title: 'Registrar' },
	'ng-nuc': { title: 'Executive Secretary' },
	'ng-ubec': { title: 'Executive Secretary', basis: 'the Compulsory, Free Universal Basic Education Act 2004' },
	'ng-nbte': { title: 'Executive Secretary' },
	'ng-ncce': { title: 'Executive Secretary' },
	'ng-trcn': { title: 'Registrar' },
	'ng-lrcn': { title: 'Registrar' },
	'ng-cpn': { title: 'Registrar' },
	'ng-nabteb': { title: 'Registrar' },
	'ng-neco': { title: 'Registrar' },
	'ng-nti': { title: 'Director and Chief Executive' },
	'ng-tetfund': { title: 'Executive Secretary', basis: 'the Tertiary Education Trust Fund (Establishment) Act 2011' },
	'ng-nmec': { title: 'Executive Secretary' },
	'ng-ncne': { title: 'Executive Secretary' },
	'ng-nerdc': { title: 'Executive Secretary' },
	'ng-niepa': { title: 'Director-General' },
	'ng-nmc': { title: 'Director' },
	'ng-nln': { title: 'National Librarian' },
	'ng-ninlan': { title: 'Executive Director' },
	'ng-nflv': { title: 'Director' },
	'ng-nalv': { title: 'Director' },
	'ng-nis': { title: 'Comptroller-General' },
	'ng-nscdc': { title: 'Commandant-General' },
	'ng-ncs-corrections': { title: 'Controller-General' },
	'ng-ferma': { title: 'Managing Director' },
	'ng-son': { title: 'Director-General' },
	'ng-cac': { title: 'Registrar-General' },
	'ng-ndlea': { title: 'Chairman and Chief Executive' },
	'ng-ncc': { title: 'Executive Vice-Chairman', confirm: true, basis: 'the Nigerian Communications Act 2003' },
	'ng-firs': { title: 'Executive Chairman', confirm: true, basis: 'the Nigeria Revenue Service (Establishment) Act 2025' },
	'ng-customs': { title: 'Comptroller-General' },
	'ng-dmo': { title: 'Director-General' },
	'ng-ndic': { title: 'Managing Director' },
	'ng-pencom': { title: 'Director-General', confirm: true, basis: 'the Pension Reform Act 2014' },
	'ng-nimasa': { title: 'Director-General' },
	'ng-npa': { title: 'Managing Director' },
	'ng-nerc': { title: 'Chairman', confirm: true, basis: 'the Electricity Act 2023' },
	'ng-nrc': { title: 'Managing Director' },
	'ng-ncaa': { title: 'Director-General' },
	'ng-faan': { title: 'Managing Director' },
	'ng-nuprc': { title: 'Commission Chief Executive', confirm: true, basis: 'the Petroleum Industry Act 2021' },
	'ng-nesrea': { title: 'Director-General' },
}

interface InstitutionSpec {
	id: string
	name: string
	description: string
	parentId?: string
	type?: EntitySpec['type']
	sector?: EntitySpec['sector']
	legalSourceUrl?: string
	officialUrl?: string
	aliases?: string[]
	head?: HeadSpec
	chairedBy?: string
}

/** Constitutional bodies and statutory agencies that complete the federal map. */
const INSTITUTIONS: InstitutionSpec[] = [
	// Section 153 Federal Executive Bodies not otherwise modelled.
	{
		id: 'ng-council-of-state', name: 'Council of State', type: 'advisory', chairedBy: 'ng-president',
		description: 'Advises the President on the prerogative of mercy, national population census, awards, and appointments to INEC, the National Judicial Council and the Police Service Commission. Chaired by the President; members include former Presidents, former Chief Justices and state governors.',
		legalSourceUrl: `${CONSTITUTION}#s153`,
	},
	{
		id: 'ng-national-defence-council', name: 'National Defence Council', type: 'advisory', chairedBy: 'ng-president',
		description: 'Advises the President on the defence of the sovereignty and territorial integrity of Nigeria. Chaired by the President, with the Vice-President, the Minister of Defence, the Chief of Defence Staff and the service chiefs.',
		legalSourceUrl: `${CONSTITUTION}#s153`,
	},
	{
		id: 'ng-national-security-council', name: 'National Security Council', type: 'advisory', chairedBy: 'ng-president',
		description: 'Advises the President on public security, including matters relating to any organisation or agency established by law for ensuring the security of the Federation. Chaired by the President.',
		legalSourceUrl: `${CONSTITUTION}#s153`,
	},
	{
		id: 'ng-national-economic-council', name: 'National Economic Council', type: 'advisory', chairedBy: 'ng-vice-president',
		description: 'Advises the President on the economic affairs of the Federation, in particular on coordinating the economic planning of the governments of the Federation. Chaired by the Vice-President, with the 36 state governors and the Governor of the Central Bank.',
		legalSourceUrl: `${CONSTITUTION}#s153`, aliases: ['NEC'],
	},
	{
		id: 'ng-nigeria-police-council', name: 'Nigeria Police Council', type: 'advisory', chairedBy: 'ng-president',
		description: 'Organises and administers the Nigeria Police Force and advises the President on the appointment of the Inspector-General of Police. Chaired by the President, with the 36 state governors, the Chairman of the Police Service Commission and the Inspector-General.',
		legalSourceUrl: `${CONSTITUTION}#s153`,
	},
	{
		id: 'ng-police-service-commission', name: 'Police Service Commission', type: 'commission', sector: 'independent',
		description: 'Appoints, promotes and disciplines officers of the Nigeria Police Force other than the Inspector-General.',
		legalSourceUrl: `${CONSTITUTION}#s153`, aliases: ['PSC'],
		head: { title: 'Chairman of the Police Service Commission', confirm: true, basis: S154 },
	},
	{
		id: 'ng-federal-civil-service-commission', name: 'Federal Civil Service Commission', type: 'commission', sector: 'independent',
		description: 'Appoints, promotes and disciplines persons in the federal civil service, including permanent secretaries on the President’s approval.',
		legalSourceUrl: `${CONSTITUTION}#s153`, aliases: ['FCSC'],
		head: { title: 'Chairman of the Federal Civil Service Commission', confirm: true, basis: S154 },
	},
	{
		id: 'ng-rmafc', name: 'Revenue Mobilisation Allocation and Fiscal Commission', type: 'commission', sector: 'independent',
		description: 'Monitors accruals to and disbursements from the Federation Account, and recommends the revenue allocation formula and the remuneration of political office holders.',
		legalSourceUrl: `${CONSTITUTION}#s153`, aliases: ['RMAFC'],
		head: { title: 'Chairman of RMAFC', confirm: true, basis: S154 },
	},
	// Other constitutional offices.
	{
		id: 'ng-office-of-the-auditor-general', name: 'Office of the Auditor-General for the Federation', sector: 'independent',
		description: 'Audits the public accounts of the Federation and reports to the National Assembly.',
		legalSourceUrl: `${CONSTITUTION}#s85`, aliases: ['OAuGF'],
		head: { title: 'Auditor-General for the Federation', confirm: true, basis: 'section 86 of the Constitution, on the recommendation of the Federal Civil Service Commission' },
	},
	{
		id: 'ng-ohcsf', name: 'Office of the Head of the Civil Service of the Federation', parentId: 'ng-president',
		description: 'Leads the federal civil service: career management, training, and the posting of permanent secretaries.',
		legalSourceUrl: `${CONSTITUTION}#s171`, aliases: ['OHCSF'],
		head: { title: 'Head of the Civil Service of the Federation', basis: 'section 171 of the Constitution' },
	},
	{
		id: 'ng-code-of-conduct-tribunal', name: 'Code of Conduct Tribunal', type: 'court', sector: 'judicial',
		description: 'Tries public officers for breaches of the Code of Conduct, including false asset declarations.',
		legalSourceUrl: `${CONSTITUTION}#s153`, aliases: ['CCT'],
		head: { title: 'Chairman of the Code of Conduct Tribunal', basis: 'the Fifth Schedule to the Constitution, on the recommendation of the National Judicial Council' },
	},
	// Security and intelligence.
	{
		id: 'ng-onsa', name: 'Office of the National Security Adviser', parentId: 'ng-president',
		description: 'Coordinates the national security and intelligence agencies and advises the President on security.',
		legalSourceUrl: `${CONSTITUTION}#s153`, aliases: ['ONSA', 'NSA'],
		head: { title: 'National Security Adviser', basis: 'the National Security Agencies Act' },
	},
	{
		id: 'ng-dss', name: 'Department of State Services', parentId: 'ng-onsa',
		description: 'Domestic intelligence: prevents and detects crimes against the internal security of Nigeria and protects senior government officials.',
		legalSourceUrl: `${CONSTITUTION}#s153`, officialUrl: 'https://dss.gov.ng/', aliases: ['DSS', 'SSS', 'State Security Service'],
		head: { title: 'Director-General of the DSS', basis: 'the National Security Agencies Act' },
	},
	{
		id: 'ng-nia', name: 'National Intelligence Agency', parentId: 'ng-onsa',
		description: 'Foreign intelligence and counter-intelligence outside Nigeria.',
		legalSourceUrl: `${CONSTITUTION}#s153`, aliases: ['NIA'],
		head: { title: 'Director-General of the NIA', basis: 'the National Security Agencies Act' },
	},
	{
		id: 'ng-dia', name: 'Defence Intelligence Agency', parentId: 'ng-ministry-of-defence',
		description: 'Military intelligence for the Armed Forces and the Ministry of Defence.',
		legalSourceUrl: `${CONSTITUTION}#s217`, aliases: ['DIA'],
		head: { title: 'Chief of Defence Intelligence', basis: 'the National Security Agencies Act' },
	},
	{
		id: 'ng-bpp', name: 'Bureau of Public Procurement', parentId: 'ng-president',
		description: 'Regulates federal public procurement, sets pricing standards and certifies contracts above set thresholds.',
		legalSourceUrl: 'https://www.bpp.gov.ng/', officialUrl: 'https://www.bpp.gov.ng/', aliases: ['BPP'],
		head: { title: 'Director-General', basis: 'the Public Procurement Act 2007' },
	},
	{
		id: 'ng-nfiu', name: 'Nigerian Financial Intelligence Unit', type: 'commission', sector: 'independent',
		description: 'Receives and analyses suspicious transaction reports and shares financial intelligence with law enforcement.',
		legalSourceUrl: 'https://www.nfiu.gov.ng/', officialUrl: 'https://www.nfiu.gov.ng/', aliases: ['NFIU'],
		head: { title: 'Director and Chief Executive', basis: 'the Nigerian Financial Intelligence Unit (Establishment) Act 2018' },
	},
	{
		id: 'ng-nhrc', name: 'National Human Rights Commission', type: 'commission', sector: 'independent',
		description: 'Promotes and protects human rights, receives complaints and investigates violations.',
		legalSourceUrl: 'https://www.nigeriarights.gov.ng/', aliases: ['NHRC'],
		head: { title: 'Executive Secretary', basis: 'the National Human Rights Commission (Amendment) Act 2010' },
	},
	{
		id: 'ng-public-complaints-commission', name: 'Public Complaints Commission', type: 'commission', sector: 'independent',
		description: 'The federal ombudsman: investigates complaints of administrative injustice by public bodies.',
		legalSourceUrl: 'https://pcc.gov.ng/', aliases: ['PCC'],
		head: { title: 'Chief Commissioner', basis: 'the Public Complaints Commission Act' },
	},
	// Statutory agencies under ministries.
	{ id: 'ng-sec', name: 'Securities and Exchange Commission', parentId: 'ng-ministry-of-finance', description: 'Regulates the Nigerian capital market.', officialUrl: 'https://sec.gov.ng/', aliases: ['SEC'], head: { title: 'Director-General', basis: 'the Investments and Securities Act' } },
	{ id: 'ng-naicom', name: 'National Insurance Commission', parentId: 'ng-ministry-of-finance', description: 'Regulates and supervises the insurance industry.', officialUrl: 'https://naicom.gov.ng/', aliases: ['NAICOM'], head: { title: 'Commissioner for Insurance' } },
	{ id: 'ng-oagf', name: 'Office of the Accountant-General of the Federation', parentId: 'ng-ministry-of-finance', description: 'Manages federal government accounts, treasury operations and payments.', aliases: ['OAGF'], head: { title: 'Accountant-General of the Federation' } },
	{ id: 'ng-amcon', name: 'Asset Management Corporation of Nigeria', type: 'corporation', parentId: 'ng-ministry-of-finance', description: 'Resolves non-performing loans acquired from Nigerian banks.', aliases: ['AMCON'], head: { title: 'Managing Director' } },
	{ id: 'ng-nbs', name: 'National Bureau of Statistics', parentId: 'ng-ministry-of-budget', description: 'Produces official statistics on inflation, output, labour and living standards.', officialUrl: 'https://nigerianstat.gov.ng/', aliases: ['NBS'], head: { title: 'Statistician-General of the Federation', basis: 'the Statistics Act 2007' } },
	{ id: 'ng-nta', name: 'Nigerian Television Authority', type: 'corporation', parentId: 'ng-ministry-of-information', description: 'The national public television broadcaster.', officialUrl: 'https://www.nta.ng/', aliases: ['NTA'], head: { title: 'Director-General' } },
	{ id: 'ng-frcn', name: 'Federal Radio Corporation of Nigeria', type: 'corporation', parentId: 'ng-ministry-of-information', description: 'The national public radio broadcaster, Radio Nigeria.', aliases: ['FRCN', 'Radio Nigeria'], head: { title: 'Director-General' } },
	{ id: 'ng-von', name: 'Voice of Nigeria', type: 'corporation', parentId: 'ng-ministry-of-information', description: 'Nigeria’s external international broadcaster.', aliases: ['VON'], head: { title: 'Director-General' } },
	{ id: 'ng-nan', name: 'News Agency of Nigeria', type: 'corporation', parentId: 'ng-ministry-of-information', description: 'The national news agency.', aliases: ['NAN'], head: { title: 'Managing Director' } },
	{ id: 'ng-noa', name: 'National Orientation Agency', parentId: 'ng-ministry-of-information', description: 'Public enlightenment and civic education.', aliases: ['NOA'], head: { title: 'Director-General' } },
	{ id: 'ng-nbc', name: 'National Broadcasting Commission', parentId: 'ng-ministry-of-information', description: 'Licenses and regulates radio and television broadcasting.', officialUrl: 'https://www.nbc.gov.ng/', aliases: ['NBC'], head: { title: 'Director-General' } },
	{ id: 'ng-nitda', name: 'National Information Technology Development Agency', parentId: 'ng-ministry-of-communications', description: 'Plans and regulates information technology development and standards.', officialUrl: 'https://nitda.gov.ng/', aliases: ['NITDA'], head: { title: 'Director-General' } },
	{ id: 'ng-ndpc', name: 'Nigeria Data Protection Commission', parentId: 'ng-ministry-of-communications', description: 'Regulates the processing of personal data under the Nigeria Data Protection Act 2023.', aliases: ['NDPC'], head: { title: 'National Commissioner', basis: 'the Nigeria Data Protection Act 2023' } },
	{ id: 'ng-nipost', name: 'Nigerian Postal Service', type: 'corporation', parentId: 'ng-ministry-of-communications', description: 'The national postal operator.', aliases: ['NIPOST'], head: { title: 'Postmaster-General of the Federation' } },
	{ id: 'ng-nigcomsat', name: 'Nigerian Communications Satellite Limited', type: 'corporation', parentId: 'ng-ministry-of-communications', description: 'Operates Nigeria’s communications satellites.', aliases: ['NIGCOMSAT'], head: { title: 'Managing Director' } },
	{ id: 'ng-nema', name: 'National Emergency Management Agency', parentId: 'ng-ministry-of-humanitarian-affairs', description: 'Coordinates disaster preparedness, response and relief.', officialUrl: 'https://nema.gov.ng/', aliases: ['NEMA'], head: { title: 'Director-General' } },
	{ id: 'ng-nsipa', name: 'National Social Investment Programme Agency', parentId: 'ng-ministry-of-humanitarian-affairs', description: 'Runs conditional cash transfers, school feeding and N-Power.', aliases: ['NSIPA'], head: { title: 'National Coordinator' } },
	{ id: 'ng-nddc', name: 'Niger Delta Development Commission', parentId: 'ng-ministry-of-regional-development', description: 'Development of the oil-producing Niger Delta states.', officialUrl: 'https://nddc.gov.ng/', aliases: ['NDDC'], head: { title: 'Managing Director', confirm: true, basis: 'the NDDC (Establishment) Act 2000' } },
	{ id: 'ng-nedc', name: 'North East Development Commission', parentId: 'ng-ministry-of-regional-development', description: 'Reconstruction and development of the North East after the insurgency.', aliases: ['NEDC'], head: { title: 'Managing Director' } },
	{ id: 'ng-nimet', name: 'Nigerian Meteorological Agency', parentId: 'ng-ministry-of-aviation', description: 'Weather and climate services for aviation, agriculture and the public.', officialUrl: 'https://nimet.gov.ng/', aliases: ['NiMet'], head: { title: 'Director-General' } },
	{ id: 'ng-nsib', name: 'Nigerian Safety Investigation Bureau', parentId: 'ng-ministry-of-aviation', description: 'Investigates aviation, rail and maritime accidents.', aliases: ['NSIB'], head: { title: 'Director-General' } },
	{ id: 'ng-niwa', name: 'National Inland Waterways Authority', parentId: 'ng-ministry-of-marine', description: 'Manages and develops navigable inland waterways.', aliases: ['NIWA'], head: { title: 'Managing Director' } },
	{ id: 'ng-shippers-council', name: 'Nigerian Shippers’ Council', parentId: 'ng-ministry-of-marine', description: 'Economic regulator of ports and protector of shippers’ interests.', aliases: ['NSC', 'Shippers Council'], head: { title: 'Executive Secretary' } },
	{ id: 'ng-nmdpra', name: 'Nigerian Midstream and Downstream Petroleum Regulatory Authority', parentId: 'ng-ministry-of-petroleum', description: 'Regulates midstream and downstream petroleum operations.', aliases: ['NMDPRA'], head: { title: 'Authority Chief Executive', confirm: true, basis: 'the Petroleum Industry Act 2021' } },
	{ id: 'ng-ncdmb', name: 'Nigerian Content Development and Monitoring Board', parentId: 'ng-ministry-of-petroleum', description: 'Enforces local content in the oil and gas industry.', aliases: ['NCDMB'], head: { title: 'Executive Secretary' } },
	{ id: 'ng-rea', name: 'Rural Electrification Agency', parentId: 'ng-ministry-of-power', description: 'Extends electricity to unserved and rural communities.', aliases: ['REA'], head: { title: 'Managing Director' } },
	{ id: 'ng-tcn', name: 'Transmission Company of Nigeria', type: 'corporation', parentId: 'ng-ministry-of-power', description: 'Operates the national electricity transmission grid.', aliases: ['TCN'], head: { title: 'Managing Director' } },
	{ id: 'ng-legal-aid-council', name: 'Legal Aid Council of Nigeria', parentId: 'ng-ministry-of-justice', description: 'Provides free legal representation to indigent citizens.', head: { title: 'Director-General' } },
	{ id: 'ng-nysc', name: 'National Youth Service Corps', parentId: 'ng-ministry-of-youth', description: 'The one-year national service for graduates.', officialUrl: 'https://www.nysc.gov.ng/', aliases: ['NYSC'], head: { title: 'Director-General' } },
	{ id: 'ng-nipc', name: 'Nigerian Investment Promotion Commission', parentId: 'ng-ministry-of-industry', description: 'Promotes and facilitates investment into Nigeria.', aliases: ['NIPC'], head: { title: 'Executive Secretary' } },
	{ id: 'ng-nepc', name: 'Nigerian Export Promotion Council', parentId: 'ng-ministry-of-industry', description: 'Promotes non-oil exports.', aliases: ['NEPC'], head: { title: 'Executive Director' } },
	{ id: 'ng-itf', name: 'Industrial Training Fund', parentId: 'ng-ministry-of-industry', description: 'Funds and sets standards for skills training in industry.', aliases: ['ITF'], head: { title: 'Director-General' } },
	{ id: 'ng-fccpc', name: 'Federal Competition and Consumer Protection Commission', parentId: 'ng-ministry-of-industry', description: 'Enforces competition law and protects consumers.', aliases: ['FCCPC'], head: { title: 'Executive Vice-Chairman', basis: 'the Federal Competition and Consumer Protection Act 2018' } },
	{ id: 'ng-nsitf', name: 'Nigeria Social Insurance Trust Fund', parentId: 'ng-ministry-of-labour', description: 'Administers the employees’ compensation scheme.', aliases: ['NSITF'], head: { title: 'Managing Director' } },
	{ id: 'ng-nasrda', name: 'National Space Research and Development Agency', parentId: 'ng-ministry-of-science', description: 'Nigeria’s space agency.', aliases: ['NASRDA'], head: { title: 'Director-General' } },
	{ id: 'ng-notap', name: 'National Office for Technology Acquisition and Promotion', parentId: 'ng-ministry-of-science', description: 'Registers technology transfer agreements and promotes local innovation.', aliases: ['NOTAP'], head: { title: 'Director-General' } },
	{ id: 'ng-mco', name: 'Mining Cadastre Office', parentId: 'ng-ministry-of-solid-minerals', description: 'Grants and administers mineral titles.', aliases: ['MCO'], head: { title: 'Director-General', basis: 'the Nigerian Minerals and Mining Act 2007' } },
	{ id: 'ng-ngsa', name: 'Nigerian Geological Survey Agency', parentId: 'ng-ministry-of-solid-minerals', description: 'Geological mapping and mineral exploration data.', aliases: ['NGSA'], head: { title: 'Director-General' } },
	{ id: 'ng-federal-fire-service', name: 'Federal Fire Service', parentId: 'ng-ministry-of-interior', description: 'Fire prevention, firefighting and rescue.', aliases: ['FFS'], head: { title: 'Controller-General' } },
	{ id: 'ng-nosdra', name: 'National Oil Spill Detection and Response Agency', parentId: 'ng-ministry-of-environment', description: 'Detects and coordinates the response to oil spills.', aliases: ['NOSDRA'], head: { title: 'Director-General' } },
	{ id: 'ng-nihsa', name: 'Nigeria Hydrological Services Agency', parentId: 'ng-ministry-of-water-resources', description: 'Monitors water resources and issues the annual flood outlook.', aliases: ['NIHSA'], head: { title: 'Director-General' } },
	{ id: 'ng-ncmm', name: 'National Commission for Museums and Monuments', parentId: 'ng-ministry-of-art-culture-tourism', description: 'Manages national museums, monuments and heritage sites, and leads the repatriation of looted artefacts.', aliases: ['NCMM', 'Museum Commission'], head: { title: 'Director-General' } },
	{ id: 'ng-fmbn', name: 'Federal Mortgage Bank of Nigeria', type: 'corporation', parentId: 'ng-ministry-of-housing', description: 'Manages the National Housing Fund and provides mortgage finance.', aliases: ['FMBN'], head: { title: 'Managing Director' } },
	{ id: 'ng-fha', name: 'Federal Housing Authority', parentId: 'ng-ministry-of-housing', description: 'Develops federal housing estates.', aliases: ['FHA'], head: { title: 'Managing Director' } },
]

const entities: EntitySpec[] = INSTITUTIONS.map((spec) => ({
	id: spec.id,
	name: spec.name,
	type: spec.type ?? 'department',
	sector: spec.sector ?? 'executive',
	description: spec.description,
	legalSourceUrl: spec.legalSourceUrl ?? spec.officialUrl ?? '',
	officialUrl: spec.officialUrl,
	aliases: spec.aliases,
	parentId: spec.parentId,
	chairedBy: spec.chairedBy,
	head: spec.head ? headSeat(spec.id, spec.head) : undefined,
}))

export const nigeriaInstitutionsCatalog: Catalog = {
	id: 'ng-institutions',
	name: 'Constitutional bodies and statutory agencies',
	constituency: {
		id: 'ng-people',
		name: 'People of Nigeria',
		description: 'Unused. Merged into the federal catalog.',
	},
	entities,
	elects: [],
	oversees: INSTITUTIONS.filter((spec) => spec.parentId).map((spec) => ({ fromId: spec.parentId!, toId: spec.id })),
}
