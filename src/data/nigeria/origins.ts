/**
 * The state each federal minister was nominated from, for the federal character view.
 *
 * Section 147(3) of the Constitution requires at least one minister from every state, so
 * nominations are announced state by state. `nominated` means a report of the nomination or
 * Senate screening names the state; `hometown` means we only have the minister's recorded
 * hometown, which usually but not always matches the slot they fill. Birthplace alone is
 * never used: General Musa was born in Sokoto but is from Zangon Kataf, Kaduna.
 *
 * Keys are officeholder names exactly as the graph records them.
 */
export interface MinisterOrigin {
	stateId: string
	basis: 'nominated' | 'hometown'
	sourceUrl: string
}

const PM_NEWS_2023 = 'https://pmnewsnigeria.com/2023/08/03/full-list-of-2023-ministerial-nominees-and-their-states/'

const nominated2023 = (stateId: string): MinisterOrigin => ({ stateId, basis: 'nominated', sourceUrl: PM_NEWS_2023 })

export const MINISTER_ORIGINS: Record<string, MinisterOrigin> = {
	// The 2023 cabinet, from the list of nominees by state read to the Senate.
	'Ekperikpe Ekpo': nominated2023('ng-akwa-ibom-state'),
	'Heineken Lokpobiri': nominated2023('ng-bayelsa-state'),
	'John Owan Enoh': nominated2023('ng-cross-river-state'),
	'Abubakar Momoh': nominated2023('ng-edo-state'),
	'Nyesom Wike': nominated2023('ng-rivers-state'),
	'Muhammad Ali Pate': nominated2023('ng-bauchi-state'),
	'Abubakar Kyari': nominated2023('ng-borno-state'),
	"Sa'idu Alkali": nominated2023('ng-gombe-state'),
	'Uba Maigari Ahmadu': nominated2023('ng-taraba-state'),
	'Ibrahim Gaidam': nominated2023('ng-yobe-state'),
	'Hannatu Musa Musawa': nominated2023('ng-katsina-state'),
	'Yusuf T. Sununu': nominated2023('ng-kebbi-state'),
	'Abubakar Atiku Bagudu': nominated2023('ng-kebbi-state'),
	'Bello Muhammad Goronyo': nominated2023('ng-sokoto-state'),
	'Bello Mohammed Matawalle': nominated2023('ng-zamfara-state'),
	'Nkiruka Onyejeocha': nominated2023('ng-abia-state'),
	'David Umahi': nominated2023('ng-ebonyi-state'),
	'Doris Uzoka-Anite': nominated2023('ng-imo-state'),
	'Oladele Henry Alake': nominated2023('ng-ekiti-state'),
	'Maruf Tunji Alausa': nominated2023('ng-lagos-state'),
	'Iziaq Adekunle Salako': nominated2023('ng-ogun-state'),
	'Bosun Tijani': nominated2023('ng-ogun-state'),
	'Olubunmi Tunji-Ojo': nominated2023('ng-ondo-state'),
	'Adegboyega Oyetola': nominated2023('ng-osun-state'),
	'Joseph Terlumun Utsev': nominated2023('ng-benue-state'),
	'Zephaniah Bitrus Jisalo': nominated2023('ng-fct'),
	'Shuaibu Abubakar Audu': nominated2023('ng-kogi-state'),
	'Lateef Olasunkanmi Fagbemi': nominated2023('ng-kwara-state'),
	'Imaan Sulaiman-Ibrahim': nominated2023('ng-nasarawa-state'),
	'Mohammed Idris': nominated2023('ng-niger-state'),
	'Aliyu Sabi Abdullahi': nominated2023('ng-niger-state'),
	'Festus Keyamo': { stateId: 'ng-delta-state', basis: 'hometown', sourceUrl: 'https://en.wikipedia.org/wiki/Festus_Keyamo' },

	// Later nominations.
	'Mariya Mahmoud': {
		stateId: 'ng-kano-state',
		basis: 'nominated',
		sourceUrl: 'https://www.premiumtimesng.com/news/top-news/614672-profile-mariya-mahmud-kanos-new-minister-nominee.html',
	},
	'Balarabe Abbas Lawal': {
		stateId: 'ng-kaduna-state',
		basis: 'nominated',
		sourceUrl: 'https://dailytrust.com/senate-confirms-ministerial-nominee-who-collapsed-during-screening-2-others/',
	},
	'Ayodele Olawande': {
		stateId: 'ng-ondo-state',
		basis: 'nominated',
		sourceUrl: 'https://dailytrust.com/senate-confirms-ministerial-nominee-who-collapsed-during-screening-2-others/',
	},
	'Bianca Odumegwu-Ojukwu': { stateId: 'ng-anambra-state', basis: 'hometown', sourceUrl: 'https://pulse.ng/news/local/new-ministers-meet-president-tinubus-chosen-7/ly6x1ze' },
	'Muhammadu Maigari Dingyadi': { stateId: 'ng-sokoto-state', basis: 'hometown', sourceUrl: 'https://pulse.ng/news/local/new-ministers-meet-president-tinubus-chosen-7/ly6x1ze' },
	'Yusuf Abdullahi Atah': { stateId: 'ng-kano-state', basis: 'hometown', sourceUrl: 'https://pulse.ng/news/local/new-ministers-meet-president-tinubus-chosen-7/ly6x1ze' },
	'Suwaiba Said Ahmad': { stateId: 'ng-jigawa-state', basis: 'hometown', sourceUrl: 'https://en.wikipedia.org/wiki/Suwaiba_Ahmad' },
	'Jumoke Oduwole': { stateId: 'ng-lagos-state', basis: 'hometown', sourceUrl: 'https://en.wikipedia.org/wiki/Jumoke_Oduwole' },
	'Idi Mukhtar Maiha': {
		stateId: 'ng-adamawa-state',
		basis: 'nominated',
		sourceUrl: 'https://blueprint.ng/why-mamman-was-sacked-as-minister/',
	},
	'Kingsley T. Udeh': {
		stateId: 'ng-enugu-state',
		basis: 'nominated',
		sourceUrl: 'https://guardian.ng/news/tinubu-nominates-enugu-attorney-general-to-replace-nnaji/',
	},
	'Bernard M. Doro': {
		stateId: 'ng-plateau-state',
		basis: 'nominated',
		sourceUrl: 'https://www.channelstv.com/2025/10/30/just-in-senate-confirms-bernard-doro-as-minister/',
	},
	'Christopher Gwabin Musa': { stateId: 'ng-kaduna-state', basis: 'hometown', sourceUrl: 'https://x.com/ubasanius/status/1995891289204617668' },
	'Joseph Olasunkanmi Tegbe': {
		stateId: 'ng-oyo-state',
		basis: 'nominated',
		sourceUrl: 'https://businesspost.ng/jobs/tinubu-picks-joseph-tegbe-to-replace-adelabu-as-power-minister/',
	},
	'Taiwo Oyedele': { stateId: 'ng-ondo-state', basis: 'hometown', sourceUrl: 'https://en.wikipedia.org/wiki/Taiwo_Oyedele' },
	'Muttaqa Rabe Darma': {
		stateId: 'ng-katsina-state',
		basis: 'nominated',
		sourceUrl: 'https://nairametrics.com/2026/04/21/meet-nigerias-housing-minister-designate-muttaqha-rabe-darma/',
	},
	'Sola Enikanolaiye': {
		stateId: 'ng-kogi-state',
		basis: 'nominated',
		sourceUrl: 'https://statehouse.gov.ng/president-tinubu-names-bianca-odumegwu-ojukwu-as-minister-of-foreign-affairs-nominates-amb-sola-enikanolaiye-as-minister-of-state/',
	},
}
