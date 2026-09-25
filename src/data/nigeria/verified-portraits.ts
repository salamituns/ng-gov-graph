import type { CompiledGraph } from '@/lib/graph/types'

/**
 * Official portraits checked by hand against the page that publishes them. Each image is named for the
 * person or captioned with their name on an official site; the page is kept so a new holder's photo can
 * be checked before this one is replaced.
 */
export const VERIFIED_PORTRAITS: Record<string, { imageUrl: string; sourceUrl: string }> = {
	'Abdullahi Yusufu Ribadu': { imageUrl: 'https://www.nuc.edu.ng/wp-content/uploads/2025/04/NUC-ES-Prof-Ribadu-3.png', sourceUrl: 'https://www.nuc.edu.ng/' },
	'Abubakar Atiku Bagudu': { imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Abubakar_Bagudu_-_2023_%28cropped%29.jpg/500px-Abubakar_Bagudu_-_2023_%28cropped%29.jpg', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Abubakar_Bagudu_-_2023_(cropped).jpg' },
	'Adamu Adaji': { imageUrl: 'https://boundarycommission.gov.ng/wp-content/uploads/2021/06/adamu_adaji.jpg', sourceUrl: 'https://boundarycommission.gov.ng/directors-profiles/' },
	'Adeyemi Adeniran': { imageUrl: 'https://www.nigerianstat.gov.ng/assets/images/adeniran.png', sourceUrl: 'https://www.nigerianstat.gov.ng/page/about-us' },
	'Alex Badeh Jr.': { imageUrl: 'https://www.nsib.gov.ng/images/team/dg_nsib.jpg', sourceUrl: 'https://www.nsib.gov.ng/' },
	'Aminu Maida': { imageUrl: 'https://old.ncc.gov.ng/images/ncc/commissioners/evc_maida.jpg', sourceUrl: 'https://old.ncc.gov.ng/the-ncc/commissioners/1414-executive-vice-chairman-aminu-maida' },
	'Angela Ajala': { imageUrl: 'https://www.ncce.gov.ng/Media/Gallery/010520260347411ES_AJALA.jpeg', sourceUrl: 'https://www.ncce.gov.ng/ES/Details' },
	'Anthony Ojukwu': { imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Anthony_Ojukwu_Feb_2023.jpg/500px-Anthony_Ojukwu_Feb_2023.jpg', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Anthony_Ojukwu_Feb_2023.jpg' },
	'Ayodeji Oludare Sotinrin': { imageUrl: 'https://boanig.com/wp-content/uploads/2025/10/managing-director-chief-executive-1.png', sourceUrl: 'https://boanig.com/our-management/' },
	'Badamasi Lawal': { imageUrl: 'https://www.nsipa.gov.ng/images/team/nc.png', sourceUrl: 'https://www.nsipa.gov.ng/' },
	'Bashir Abubakar': { imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Hon._Bashir_Abubakar_MFR.jpg/500px-Hon._Bashir_Abubakar_MFR.jpg', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Hon._Bashir_Abubakar_MFR.jpg' },
	'Bosun Tijani': { imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Bosun_Tijani%2C_co-founder_of_the_Co-Creation_Hub%2C_Lagos_%288102020609%29.jpg/500px-Bosun_Tijani%2C_co-founder_of_the_Co-Creation_Hub%2C_Lagos_%288102020609%29.jpg', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Bosun_Tijani,_co-founder_of_the_Co-Creation_Hub,_Lagos_(8102020609).jpg' },
	'Chinwe Veronica Anunobi': { imageUrl: 'https://www.nln.gov.ng/assets/img/dept/ceo1.png', sourceUrl: 'https://www.nln.gov.ng/officeofnl.php' },
	'Dasuki Ibrahim Arabi': { imageUrl: 'https://bpsr.gov.ng/wp-content/uploads/2024/09/DG-2-1.png', sourceUrl: 'https://bpsr.gov.ng/management-team' },
	'Emmanuel Akomaye Parker Undiandeye': { imageUrl: 'https://statehouse.gov.ng/wp-content/uploads/2025/10/MAJOR-GENERAL-EMMANUEL-AKOMAYE-PARKER-UNDIANDEYE-DIA.jpeg', sourceUrl: 'https://statehouse.gov.ng/curriculum-vitae-of-new-service-chiefs/' },
	'Emomotimi Agama': { imageUrl: 'https://home.sec.gov.ng/media/images/web-DR-EMOMOTIMI-AGAMA-SEC-DG_i8.width-3000.format-avif.avif', sourceUrl: 'https://home.sec.gov.ng/about/organizational-chart/board-of-directors/' },
	'George Akume': { imageUrl: 'https://www.osgf.gov.ng/wp-content/uploads/2023/07/SGF-2.jpg', sourceUrl: 'https://www.osgf.gov.ng/' },
	'Hannatu Musa Musawa': { imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/67/Hannatu_Musawa_%282024%29_%28cropped%29.jpg', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Hannatu_Musawa_(2024)_(cropped).jpg' },
	'Hashimu Salihu Argungu': { imageUrl: 'https://psc.gov.ng/wp-content/uploads/2024/07/Chm1-Argungu-240x300.jpg', sourceUrl: 'https://psc.gov.ng/the-hon-chairman/' },
	'Idi Abbas': { imageUrl: 'https://navy.mil.ng/images/cns1.webp', sourceUrl: 'https://navy.mil.ng/' },
	'Innocent Barikor': { imageUrl: 'https://nesrea.gov.ng/wp-content/uploads/2025/01/Dr.-Innocent-Barikor.jpeg', sourceUrl: 'https://nesrea.gov.ng/' },
	'Jane Nkechi Egerton-Idehen': { imageUrl: 'https://nigcomsat.gov.ng/storage/images/team/Iz5B5FpJzkdpYOoBK6KIxEb811mGuFdngm7Qg4Tt.webp', sourceUrl: 'https://nigcomsat.gov.ng/about-us/management' },
	'Jide Idris': { imageUrl: 'https://www.ncdc.gov.ng/themes/common/imgs/content/5.jpg', sourceUrl: 'https://www.ncdc.gov.ng/dg' },
	'John Oladapo Obafunwa': { imageUrl: 'https://nimr.gov.ng/nimr/wp-content/uploads/2024/08/Professor-John-Oladapo-Obafunwa-img-243x300.jpg', sourceUrl: 'https://nimr.gov.ng/' },
	'Kayode Opeifa': { imageUrl: 'https://nrc.gov.ng/wp-content/uploads/2025/01/md_2025_profile.jpg', sourceUrl: 'https://nrc.gov.ng/management/' },
	'Kelechi Ohiri': { imageUrl: 'https://www.nhia.gov.ng/wp-content/uploads/2025/04/DG-picture1_2025-2.png', sourceUrl: 'https://www.nhia.gov.ng/dg-ceo/' },
	'Lateef Olasunkanmi Fagbemi': { imageUrl: 'https://justice.gov.ng/wp-content/uploads/elementor/thumbs/Lateef-Olasunkanmi-Fagbemi-qcm38plqiom3tg7b384y0t7wdor5ca0mgfz83wk5xk.jpg', sourceUrl: 'https://www.justice.gov.ng/' },
	'Mainasara Umar Kogo': { imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Barr._Dr._Mainasara_Ibrahim_Kogo_Umar.jpg', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Barr._Dr._Mainasara_Ibrahim_Kogo_Umar.jpg' },
	'Matthew Adepoju': { imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Prof_Adepoju_Matthew.jpg/500px-Prof_Adepoju_Matthew.jpg', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Prof_Adepoju_Matthew.jpg' },
	'Mohamed Buba Marwa': { imageUrl: 'https://ndlea.gov.ng/img/MANAGERS/CHAIRMAN3.png', sourceUrl: 'https://ndlea.gov.ng/about' },
	'Mohammed Bello Shehu': { imageUrl: 'https://rmafc.gov.ng/wp-content/uploads/2026/02/IMAGE-e1788173263539-640x669.png', sourceUrl: 'https://rmafc.gov.ng/members/' },
	'Mohammed Idris': { imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Mohammed_Idris_Portrait_03.jpg/330px-Mohammed_Idris_Portrait_03.jpg', sourceUrl: 'https://en.wikipedia.org/wiki/Mohammed_Idris_Malagi' },
	'Muhammad Mai Abubakar': { imageUrl: 'https://arabicvillage.com.ng/themes/custom/arabicvillage/images/director.jpg', sourceUrl: 'https://arabicvillage.com.ng/#director' },
	'Nyesom Wike': { imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c0/Nyesom_Wike_%282015%29.jpg', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Nyesom_Wike_(2015).jpg' },
	'Obi Adigwe': { imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Obi_Adigwe.png/500px-Obi_Adigwe.png', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Obi_Adigwe.png' },
	'Olakunle Oluseye Nafiu': { imageUrl: 'https://www.nysc.gov.ng/img/dg-official.jpg', sourceUrl: 'https://www.nysc.gov.ng/' },
	'Olatunji Disu': { imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Olatunji_Disu.jpg/500px-Olatunji_Disu.jpg', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Olatunji_Disu.jpg' },
	'Olayemi Cardoso': { imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Olayemi_Cardoso_01.jpg/500px-Olayemi_Cardoso_01.jpg', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Olayemi_Cardoso_01.jpg' },
	'Olusegun Ayo Omosehin': { imageUrl: 'https://naicom.gov.ng/wp-content/uploads/2020/07/Mr-Olusegun-Ayo-Omosehin_-Commisoner-for-Insurance_-Potrait-Photo.png', sourceUrl: 'https://naicom.gov.ng/team/mr-olusegun-ayo-omosehin/' },
	'Omolola Oloworaran': { imageUrl: 'https://www.pencom.gov.ng/wp-content/uploads/2017/08/DSC_2641.jpg', sourceUrl: 'https://www.pencom.gov.ng/category/about-us/members-of-the-board/' },
	'Oyetunde Oladimeji Ojo': { imageUrl: 'https://fha.gov.ng/storage/app/media/management-teams/management%20profile%20pictures/md_pic.png', sourceUrl: 'https://fha.gov.ng/management-teams' },
	'Ronke Soyombo': { imageUrl: 'https://www.trcn.gov.ng/lovable-uploads/registrar-ronke-soyombo.jpg', sourceUrl: 'https://www.trcn.gov.ng/office-of-registrar' },
	'Salihu Abdulhamid Dembos': { imageUrl: 'https://webdesk.nta.ng/wp-content/uploads/2026/09/Dembos-1024x539.jpg', sourceUrl: 'https://www.nta.ng/news/corporate/nta-dg-salihu-dembos-gets-family-backing-after-tinubus-reappointment' },
	'Salisu Shehu': { imageUrl: 'https://nerdc.gov.ng/graphics/new/es_nerdc2.png', sourceUrl: 'https://nerdc.gov.ng/content_manager/management_team.html' },
	'Segun Aina': { imageUrl: 'https://www.jamb.gov.ng/assets/global/img/Registrar.png', sourceUrl: 'https://www.jamb.gov.ng/Management' },
	'Shamseldeen B. Ogunjimi': { imageUrl: 'https://oagf.gov.ng/wp-content/uploads/2025/03/Dr.-Shamseldeen-B.-Ogunjimi-1024x815.jpg', sourceUrl: 'https://oagf.gov.ng/agf_profile/mr-ogunjimi-shamseldeen-babatunde/' },
	'Shehu Usman Osidi': { imageUrl: 'https://fmbn.gov.ng/backend/storage/uploads/6aSRbS0tfPDi9rAQFod9lKQweGn6tHthOhe3sqEY.png', sourceUrl: 'https://fmbn.gov.ng/about/board-of-directors' },
	'Shuaibu Abubakar Audu': { imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Shuaibu_Abubakar_Audu.jpg/500px-Shuaibu_Abubakar_Audu.jpg', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Shuaibu_Abubakar_Audu.jpg' },
	'Sonny S. T. Echono': { imageUrl: 'https://res.cloudinary.com/myskoolp/image/upload/v1/mbira-test/teams/jpg/dtues8ktke4jjvmcm9ty.jpeg', sourceUrl: 'https://www.tetfund.gov.ng/about' },
	'Sunday Kelvin Aneke': { imageUrl: 'https://statehouse.gov.ng/wp-content/uploads/2025/10/AVM-Sunday-K-Aneke-300x196.jpg', sourceUrl: 'https://statehouse.gov.ng/curriculum-vitae-of-new-service-chiefs/' },
	'Tajudeen Abbas': { imageUrl: 'https://nass.gov.ng/themes/newnass/images/mps/92.jpg', sourceUrl: 'https://nass.gov.ng/' },
	'Tunji Bello': { imageUrl: 'https://fccpc.gov.ng/wp-content/uploads/2024/07/Tunji-Bello-Executive-Vice-Chairman-min.png', sourceUrl: 'https://fccpc.gov.ng/about-us/people/board-members/mr-tunji-bello/' },
	'Udo Herbert': { imageUrl: 'https://nias.gov.ng/wp-content/uploads/2021/09/PROF-UDOH-HERBERT-180x180.jpg', sourceUrl: 'https://nias.gov.ng/management-team/' },
	'Umar Yusuf Girei': { imageUrl: 'https://niwa.gov.ng/wp-content/uploads/2026/03/Yusuf-Girei.jpeg', sourceUrl: 'https://niwa.gov.ng/about' },
	'Zubaida Umar': { imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Zubaida_Umar.jpg/500px-Zubaida_Umar.jpg', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Zubaida_Umar.jpg' },
	'Nuhu Ribadu': { imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/National_Security_Adviser_of_Nigeria_Nuhu_Ribadu_at_the_State_Department_in_Washington%2C_D.C._on_January_17%2C_2024_%28cropped%29.jpg/500px-National_Security_Adviser_of_Nigeria_Nuhu_Ribadu_at_the_State_Department_in_Washington%2C_D.C._on_January_17%2C_2024_%28cropped%29.jpg', sourceUrl: 'https://commons.wikimedia.org/wiki/File:National_Security_Adviser_of_Nigeria_Nuhu_Ribadu_at_the_State_Department_in_Washington,_D.C._on_January_17,_2024_(cropped).jpg' },
	'Oladele Henry Alake': { imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Dele_Alake_image.jpeg/500px-Dele_Alake_image.jpeg', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Dele_Alake_image.jpeg' },
}

export const PORTRAITS_CHECKED_AT = '2026-09-25'

/** Gives every seat and body held by a verified person their portrait, where none is recorded yet. */
export function applyVerifiedPortraits(graph: CompiledGraph): CompiledGraph {
	for (const node of Object.values(graph.nodes)) {
		node.people = node.people.map((person) => {
			const verified = VERIFIED_PORTRAITS[person.name]
			return verified && !person.imageUrl ? { ...person, imageUrl: verified.imageUrl, imageSourceUrl: verified.sourceUrl } : person
		})
	}
	return graph
}
