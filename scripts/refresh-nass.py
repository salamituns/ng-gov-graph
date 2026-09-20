from __future__ import annotations

import json
import re
import subprocess
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'src/data/nigeria/nass.ts'
NASS = 'https://nass.gov.ng/mps/get_legislators/'

DISTRICTS = {
	'abia': ['north', 'south', 'central'],
	'adamawa': ['north', 'south', 'central'],
	'akwa-ibom': ['north-east', 'north-west', 'south'],
	'anambra': ['north', 'south', 'central'],
	'bauchi': ['north', 'south', 'central'],
	'bayelsa': ['east', 'west', 'central'],
	'benue': ['north-east', 'north-west', 'south'],
	'borno': ['north', 'south', 'central'],
	'cross-river': ['north', 'south', 'central'],
	'delta': ['north', 'south', 'central'],
	'ebonyi': ['north', 'south', 'central'],
	'edo': ['north', 'south', 'central'],
	'ekiti': ['north', 'south', 'central'],
	'enugu': ['east', 'west', 'north'],
	'gombe': ['north', 'south', 'central'],
	'imo': ['east', 'west', 'north'],
	'jigawa': ['north-east', 'north-west', 'south-west'],
	'kaduna': ['north', 'south', 'central'],
	'kano': ['north', 'south', 'central'],
	'katsina': ['north', 'south', 'central'],
	'kebbi': ['north', 'south', 'central'],
	'kogi': ['east', 'west', 'central'],
	'kwara': ['north', 'south', 'central'],
	'lagos': ['east', 'west', 'central'],
	'nasarawa': ['north', 'south', 'west'],
	'niger': ['east', 'north', 'south'],
	'ogun': ['east', 'west', 'central'],
	'ondo': ['north', 'south', 'central'],
	'osun': ['east', 'west', 'central'],
	'oyo': ['north', 'south', 'central'],
	'plateau': ['north', 'south', 'central'],
	'rivers': ['east', 'west', 'south-east'],
	'sokoto': ['north', 'east', 'south'],
	'taraba': ['north', 'south', 'central'],
	'yobe': ['north', 'south', 'east'],
	'zamfara': ['west', 'central', 'north'],
	'fct': ['fct'],
}

STATE_SLUG = {
	'abia': 'abia',
	'adamawa': 'adamawa',
	'akwa ibom': 'akwa-ibom',
	'anambra': 'anambra',
	'bauchi': 'bauchi',
	'bayelsa': 'bayelsa',
	'benue': 'benue',
	'borno': 'borno',
	'cross river': 'cross-river',
	'delta': 'delta',
	'ebonyi': 'ebonyi',
	'edo': 'edo',
	'ekiti': 'ekiti',
	'enugu': 'enugu',
	'gombe': 'gombe',
	'imo': 'imo',
	'jigawa': 'jigawa',
	'kaduna': 'kaduna',
	'kano': 'kano',
	'katsina': 'katsina',
	'kebbi': 'kebbi',
	'kogi': 'kogi',
	'kwara': 'kwara',
	'lagos': 'lagos',
	'nasarawa': 'nasarawa',
	'nassarawa': 'nasarawa',
	'niger': 'niger',
	'ogun': 'ogun',
	'ondo': 'ondo',
	'osun': 'osun',
	'oyo': 'oyo',
	'plateau': 'plateau',
	'rivers': 'rivers',
	'sokoto': 'sokoto',
	'taraba': 'taraba',
	'yobe': 'yobe',
	'zamfara': 'zamfara',
	'federal capital territory': 'fct',
	'fct': 'fct',
}

STATE_LABEL = {
	'abia': 'Abia',
	'adamawa': 'Adamawa',
	'akwa-ibom': 'Akwa Ibom',
	'anambra': 'Anambra',
	'bauchi': 'Bauchi',
	'bayelsa': 'Bayelsa',
	'benue': 'Benue',
	'borno': 'Borno',
	'cross-river': 'Cross River',
	'delta': 'Delta',
	'ebonyi': 'Ebonyi',
	'edo': 'Edo',
	'ekiti': 'Ekiti',
	'enugu': 'Enugu',
	'gombe': 'Gombe',
	'imo': 'Imo',
	'jigawa': 'Jigawa',
	'kaduna': 'Kaduna',
	'kano': 'Kano',
	'katsina': 'Katsina',
	'kebbi': 'Kebbi',
	'kogi': 'Kogi',
	'kwara': 'Kwara',
	'lagos': 'Lagos',
	'nasarawa': 'Nasarawa',
	'niger': 'Niger',
	'ogun': 'Ogun',
	'ondo': 'Ondo',
	'osun': 'Osun',
	'oyo': 'Oyo',
	'plateau': 'Plateau',
	'rivers': 'Rivers',
	'sokoto': 'Sokoto',
	'taraba': 'Taraba',
	'yobe': 'Yobe',
	'zamfara': 'Zamfara',
	'fct': 'Federal Capital Territory',
}

HOUSE_QUOTA = {
	'abia': 8,
	'adamawa': 8,
	'akwa-ibom': 10,
	'anambra': 11,
	'bauchi': 12,
	'bayelsa': 5,
	'benue': 11,
	'borno': 10,
	'cross-river': 8,
	'delta': 10,
	'ebonyi': 6,
	'edo': 9,
	'ekiti': 6,
	'enugu': 8,
	'gombe': 6,
	'imo': 10,
	'jigawa': 11,
	'kaduna': 16,
	'kano': 24,
	'katsina': 15,
	'kebbi': 8,
	'kogi': 9,
	'kwara': 6,
	'lagos': 24,
	'nasarawa': 5,
	'niger': 10,
	'ogun': 9,
	'ondo': 9,
	'osun': 9,
	'oyo': 14,
	'plateau': 8,
	'rivers': 13,
	'sokoto': 11,
	'taraba': 6,
	'yobe': 6,
	'zamfara': 7,
	'fct': 2,
}


def slug(value: str) -> str:
	value = value.lower().replace('–', '-').replace('—', '-')
	return re.sub(r'[^a-z0-9]+', '-', value).strip('-')


def state_slug(name: str) -> str:
	return STATE_SLUG[name.strip().lower()]


def district_key(ss: str, district: str) -> str:
	d = district.lower().replace('–', '-').replace('nassarawa', 'nasarawa')
	for token in [ss.replace('-', ' '), *ss.split('-')]:
		d = re.sub(r'^' + re.escape(token) + r'[\s-]*', '', d)
	d = slug(d.replace('senatorial district', ''))
	aliases = {
		'northwest': 'north-west',
		'northeast': 'north-east',
		'southeast': 'south-east',
		'southwest': 'south-west',
	}
	d = aliases.get(d, d)
	return 'fct' if ss == 'fct' else d


def ts_str(value: str) -> str:
	return "'" + value.replace('\\', '\\\\').replace("'", "\\'") + "'"


def person_obj(name: str, party: str, member_id: str | None) -> str:
	name = re.sub(r'\s+', ' ', name).strip()
	name = re.sub(r'^(Sen\.|Hon\.)\s*', '', name)
	if not name:
		return 'null'
	parts = [f'name: {ts_str(name)}', 'appointedYear: 2023']
	if party.strip():
		parts.append(f'party: {ts_str(party.strip())}')
	if member_id and member_id.strip():
		parts.append(
			f"imageUrl: {ts_str(f'https://nass.gov.ng/themes/newnass/images/mps/{member_id.strip()}.jpg')}",
		)
	return '{ ' + ', '.join(parts) + ' }'


def fetch_chamber(chamber: int) -> list:
	url = f'{NASS}?chamber={chamber}&draw=1&start=0&length=400'
	raw = subprocess.check_output(
		['curl', '-sL', '-A', 'Govgraph/0.1', url],
		timeout=60,
	)
	payload = json.loads(raw.decode())
	return payload['data']


def district_title(ss: str, dk: str) -> str:
	if ss == 'fct':
		return 'FCT'
	label = {
		'north': 'North',
		'south': 'South',
		'central': 'Central',
		'east': 'East',
		'west': 'West',
		'north-east': 'North-East',
		'north-west': 'North-West',
		'south-east': 'South-East',
		'south-west': 'South-West',
		'fct': 'FCT',
	}[dk]
	return f'{STATE_LABEL[ss]} {label}'


def emit_seats(var: str, seats: list) -> str:
	lines = [f'export const {var}: SeatSpec[] = [']
	for seat_id, title, person in seats:
		lines.append('\t{')
		lines.append(f'\t\tid: {ts_str(seat_id)},')
		lines.append(f'\t\ttitle: {ts_str(title)},')
		lines.append(f'\t\tperson: {person},')
		lines.append('\t},')
	lines.append(']')
	return '\n'.join(lines)


def main() -> None:
	senate_rows = fetch_chamber(1)
	house_rows = fetch_chamber(2)
	matched = {}
	for name, state, district, party, mid in senate_rows:
		ss = state_slug(state)
		dk = district_key(ss, district)
		matched[(ss, dk)] = (name, party, mid)

	senate_seats = []
	elects = []
	for ss, dks in DISTRICTS.items():
		for dk in dks:
			seat_id = 'ng-senator-fct' if ss == 'fct' else f'ng-senator-{ss}-{dk}'
			title = f'Senator for {district_title(ss, dk)}'
			occ = matched.get((ss, dk))
			person = person_obj(occ[0], occ[1], occ[2]) if occ else 'null'
			senate_seats.append((seat_id, title, person))
			from_id = 'ng-fct' if ss == 'fct' else f'ng-{ss}-state'
			elects.append((from_id, seat_id))

	seen = set()
	house_by_state = defaultdict(list)
	for name, state, constituency, party, mid in house_rows:
		ss = state_slug(state)
		const = re.sub(r'\s+', ' ', constituency).strip()
		const = re.sub(r'(?i)\s*federal constituency\.?$', '', const).strip()
		key = (ss, slug(const))
		if key in seen:
			continue
		seen.add(key)
		house_by_state[ss].append((const, name, party, mid))

	house_seats = []
	for ss, quota in HOUSE_QUOTA.items():
		rows = house_by_state.get(ss, [])
		for const, name, party, mid in rows[:quota]:
			seat_id = f'ng-rep-{ss}-{slug(const)}'
			house_seats.append(
				(seat_id, f'Representative for {const}', person_obj(name, party, mid)),
			)
			from_id = 'ng-fct' if ss == 'fct' else f'ng-{ss}-state'
			elects.append((from_id, seat_id))
		missing = quota - min(len(rows), quota)
		for index in range(1, missing + 1):
			seat_id = f'ng-rep-{ss}-unlisted-{index}'
			title = f'{STATE_LABEL[ss]} federal constituency (unlisted)'
			if missing > 1:
				title += f' {index}'
			house_seats.append((seat_id, title, 'null'))
			from_id = 'ng-fct' if ss == 'fct' else f'ng-{ss}-state'
			elects.append((from_id, seat_id))

	assert len(senate_seats) == 109, len(senate_seats)
	assert len(house_seats) == 360, len(house_seats)

	header = """import type { Catalog, SeatSpec } from '@/lib/graph/types'

/**
 * District seats of the 10th National Assembly.
 * Regenerated by scripts/refresh-nass.py from nass.gov.ng.
 * Missing INEC seats stay vacant. Do not invent holders.
 */

"""
	elect_lines = ["export const nassElects: Catalog['elects'] = ["]
	for src, dest in elects:
		elect_lines.append(f"\t{{ fromId: {ts_str(src)}, toId: {ts_str(dest)} }},")
	elect_lines.append(']')
	catalog = """
export const nigeriaNassCatalog: Catalog = {
	id: 'ng-nass',
	name: 'National Assembly occupancy',
	constituency: {
		id: 'ng-people',
		name: 'People of Nigeria',
		description: 'Placeholder constituency for catalog merge.',
	},
	entities: [],
	elects: nassElects,
	oversees: [],
}
"""
	OUT.write_text(
		header
		+ emit_seats('senateDistrictSeats', senate_seats)
		+ '\n\n'
		+ emit_seats('houseDistrictSeats', house_seats)
		+ '\n\n'
		+ '\n'.join(elect_lines)
		+ '\n'
		+ catalog,
		encoding='utf-8',
	)
	occupied_s = sum(1 for item in senate_seats if item[2] != 'null')
	occupied_h = sum(1 for item in house_seats if item[2] != 'null')
	print(f'wrote {OUT} senate {occupied_s}/109 house {occupied_h}/360')


if __name__ == '__main__':
	main()
