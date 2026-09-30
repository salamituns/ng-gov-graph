/**
 * Interface text in English and four Nigerian languages.
 *
 * Only the interface is translated. Official names of offices and bodies, and the plain-language
 * constitutional provisions, stay in English, where a draft translation could mislead.
 * The Pidgin, Hausa, Yorùbá and Igbo text is a first draft awaiting review by native speakers;
 * the site says so whenever one of them is chosen.
 */
export const LANGS = [
	{ code: 'en', name: 'English' },
	{ code: 'pcm', name: 'Naijá (Pidgin)' },
	{ code: 'ha', name: 'Hausa' },
	{ code: 'yo', name: 'Yorùbá' },
	{ code: 'ig', name: 'Asụsụ Igbo' },
] as const

export type Lang = (typeof LANGS)[number]['code']

export const LANG_COOKIE = 'lang'

export function parseLang(value: string | undefined | null): Lang {
	return LANGS.some((lang) => lang.code === value) ? (value as Lang) : 'en'
}

const en = {
	language: 'Language',
	tagline: 'Nigeria’s government, mapped and sourced.',
	draftNotice: 'Draft translation, awaiting review by a native speaker.',
	peopleOfNigeria: 'People of Nigeria',
	viewGovernment: 'Government',
	viewNewsmakers: 'Newsmakers',
	layerFederal: 'Federal government',
	layerFederalHint: 'Presidency, ministries, NASS, courts',
	layerState: 'States & governors',
	layerStateHint: '36 states and the FCT by zone',
	whoRepresents: 'Who represents me?',
	whoRepresentsHint: 'Your governor, senators, members of the House of Representatives and state assembly.',
	chooseState: 'Choose your state…',
	anotherState: 'Another state…',
	yourState: 'Your state:',
	federalCharacter: 'Federal character',
	federalCharacterCard: '{covered} of {states} states and the FCT have a minister in the cabinet of {members}. See where each one comes from.',
	newsHeading: 'Government in the news',
	appointmentsHeading: 'Appointments & exits',
	numbersHeading: 'By the numbers',
	days: 'days',
	hours: 'hrs',
	minutes: 'min',
	pollsOpen: 'polls open 8:30 a.m. WAT',
	then: 'Then',
	electionGuide: 'Your election guide',
}

export type MessageKey = keyof typeof en

const pcm: Record<MessageKey, string> = {
	language: 'Language',
	tagline: 'Naija government: we don map am, we get proof.',
	draftNotice: 'Na draft translation be this. Person wey sabi Pidgin go check am.',
	peopleOfNigeria: 'Naija People',
	viewGovernment: 'Government',
	viewNewsmakers: 'Who dey news',
	layerFederal: 'Federal Government',
	layerFederalHint: 'Presidency, ministries, NASS, courts',
	layerState: 'States and governors',
	layerStateHint: '36 states and FCT, by zone',
	whoRepresents: 'Who dey represent me?',
	whoRepresentsHint: 'Your governor, your senators, your Reps and your state House of Assembly.',
	chooseState: 'Pick your state…',
	anotherState: 'Another state…',
	yourState: 'Your state:',
	federalCharacter: 'Federal character',
	federalCharacterCard: '{covered} out of {states} states plus FCT get minister for the cabinet of {members}. See where each one come from.',
	newsHeading: 'Government for news',
	appointmentsHeading: 'Who enter, who comot',
	numbersHeading: 'The numbers',
	days: 'days',
	hours: 'hrs',
	minutes: 'min',
	pollsOpen: 'voting start 8:30 a.m. WAT',
	then: 'After that,',
	electionGuide: 'Your election guide',
}

const ha: Record<MessageKey, string> = {
	language: 'Harshe',
	tagline: 'Gwamnatin Najeriya, a taswira tare da hujjoji.',
	draftNotice: 'Wannan fassara ce ta farko; mai jin Hausa zai duba ta.',
	peopleOfNigeria: 'Al’ummar Najeriya',
	viewGovernment: 'Gwamnati',
	viewNewsmakers: 'Masu labarai',
	layerFederal: 'Gwamnatin Tarayya',
	layerFederalHint: 'Fadar Shugaban Ƙasa, ma’aikatu, Majalisar Tarayya, kotuna',
	layerState: 'Jihohi da gwamnoni',
	layerStateHint: 'Jihohi 36 da Abuja, bisa shiyya',
	whoRepresents: 'Su wane ne wakilaina?',
	whoRepresentsHint: 'Gwamnanka, sanatocinka, ’yan Majalisar Wakilai da majalisar dokokin jiharka.',
	chooseState: 'Zaɓi jiharka…',
	anotherState: 'Wata jiha…',
	yourState: 'Jiharka:',
	federalCharacter: 'Daidaiton jihohi',
	federalCharacterCard: 'Jihohi {covered} cikin {states} (har da Abuja) suna da minista a majalisar ministoci mai mutum {members}. Duba inda kowanne ya fito.',
	newsHeading: 'Gwamnati a cikin labarai',
	appointmentsHeading: 'Naɗe-naɗe da sauke-sauke',
	numbersHeading: 'A ƙididdiga',
	days: 'kwanaki',
	hours: 'awanni',
	minutes: 'mintuna',
	pollsOpen: 'ana buɗe rumfunan zaɓe ƙarfe 8:30 na safe (WAT)',
	then: 'Sai kuma',
	electionGuide: 'Jagoran zaɓenka',
}

const yo: Record<MessageKey, string> = {
	language: 'Èdè',
	tagline: 'Ìjọba Nàìjíríà, lórí àwòrán-ilẹ̀ pẹ̀lú ẹ̀rí.',
	draftNotice: 'Ìtúmọ̀ àkọ́kọ́ ni èyí; ẹni tí ó gbọ́ Yorùbá dáadáa yóò ṣàyẹ̀wò rẹ̀.',
	peopleOfNigeria: 'Àwọn ará Nàìjíríà',
	viewGovernment: 'Ìjọba',
	viewNewsmakers: 'Nínú ìròyìn',
	layerFederal: 'Ìjọba Àpapọ̀',
	layerFederalHint: 'Ọ́fíìsì Ààrẹ, àwọn iléeṣẹ́ ìjọba, Ilé Aṣòfin Àpapọ̀, ilé-ẹjọ́',
	layerState: 'Àwọn ìpínlẹ̀ àti gómìnà',
	layerStateHint: 'Ìpínlẹ̀ mẹ́rìndínlógójì àti Abuja, ní agbègbè-agbègbè',
	whoRepresents: 'Ta ló ń ṣojú mi?',
	whoRepresentsHint: 'Gómìnà rẹ, àwọn sẹ́nétọ̀ rẹ, àwọn aṣojú rẹ ní Ilé Aṣojú-ṣòfin, àti Ilé Aṣòfin ìpínlẹ̀ rẹ.',
	chooseState: 'Yan ìpínlẹ̀ rẹ…',
	anotherState: 'Ìpínlẹ̀ mìíràn…',
	yourState: 'Ìpínlẹ̀ rẹ:',
	federalCharacter: 'Ìdọ́gba láàárín àwọn ìpínlẹ̀',
	federalCharacterCard: 'Ìpínlẹ̀ {covered} nínú {states} (pẹ̀lú Abuja) ní mínísítà nínú ìgbìmọ̀ mínísítà {members}. Wo ibi tí olúkúlùkù ti wá.',
	newsHeading: 'Ìjọba nínú ìròyìn',
	appointmentsHeading: 'Ìyànsípò àti ìkúrò',
	numbersHeading: 'Ní ìṣirò',
	days: 'ọjọ́',
	hours: 'wákàtí',
	minutes: 'ìṣẹ́jú',
	pollsOpen: 'ìdìbò bẹ̀rẹ̀ ní agogo 8:30 òwúrọ̀ (WAT)',
	then: 'Lẹ́yìn náà',
	electionGuide: 'Ìtọ́sọ́nà ìdìbò rẹ',
}

const ig: Record<MessageKey, string> = {
	language: 'Asụsụ',
	tagline: 'Ọchịchị Naịjirịa, n’eserese na ihe akaebe.',
	draftNotice: 'Nke a bụ ntụgharị mbụ; onye maara Igbo nke ọma ga-enyocha ya.',
	peopleOfNigeria: 'Ndị Naịjirịa',
	viewGovernment: 'Ọchịchị',
	viewNewsmakers: 'Ndị nọ n’akụkọ',
	layerFederal: 'Ọchịchị Etiti',
	layerFederalHint: 'Ọfịs Onyeisiala, ụlọ ọrụ ọchịchị, Mgbakọ Omebe Iwu, ụlọikpe',
	layerState: 'Steeti na gọvanọ',
	layerStateHint: 'Steeti 36 na FCT, dịka mpaghara si dị',
	whoRepresents: 'Ònye na-anọchite anya m?',
	whoRepresentsHint: 'Gọvanọ gị, ndị senatọ gị, ndị nnọchite anya gị n’Ụlọ Nnọchite Anya, na Ụlọ Omebe Iwu steeti gị.',
	chooseState: 'Họrọ steeti gị…',
	anotherState: 'Steeti ọzọ…',
	yourState: 'Steeti gị:',
	federalCharacter: 'Nhatanha n’etiti steeti',
	federalCharacterCard: 'Steeti {covered} n’ime {states} (gụnyere FCT) nwere minista n’ime kabinet nke mmadụ {members}. Hụ ebe onye ọ bụla si.',
	newsHeading: 'Ọchịchị n’akụkọ',
	appointmentsHeading: 'Nhọpụta na mwepụ',
	numbersHeading: 'Na ọnụọgụgụ',
	days: 'ụbọchị',
	hours: 'awa',
	minutes: 'nkeji',
	pollsOpen: 'ntuli aka na-amalite n’elekere 8:30 ụtụtụ (WAT)',
	then: 'Mgbe ahụ',
	electionGuide: 'Ntụziaka ntuli aka gị',
}

const MESSAGES: Record<Lang, Record<MessageKey, string>> = { en, pcm, ha, yo, ig }

/** Looks up a message, filling {placeholders}; falls back to English for anything missing. */
export function t(lang: Lang, key: MessageKey, values?: Record<string, string | number>) {
	const text = MESSAGES[lang][key] || en[key]
	return values ? text.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match)) : text
}

export function allMessages() {
	return MESSAGES
}
