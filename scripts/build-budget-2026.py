"""
Builds src/data/nigeria/budget-2026.ts from the 2026 Appropriation Act (details), as published by the
Budget Office of the Federation.

    pip install pymupdf
    curl -L -o act2026.pdf "https://budgetoffice.gov.ng/index.php/2026-appropriation-act-details/2026-appropriation-act-details-pdf/download"
    npx tsx scripts/dump-graph-nodes.mts > nodes.json
    python3 scripts/build-budget-2026.py act2026.pdf nodes.json > src/data/nigeria/budget-2026.ts

How the Act is read:
- Each MDA's summary lists its lines (agencies) by 10-digit code with personnel, overhead, capital and
  total. A line is kept only on a summary page, or when personnel + overhead + capital equals its total,
  which filters out stray numbers from the detailed pages.
- A ministry's total is the Act's own summary figure for it where the summary has one, and otherwise the
  sum of its lines. The first four digits of a line's code name its ministry; the Act's printed header
  codes are not used, because some are wrong (Education's header carries Defence's code).
- Two lines pass through a ministry to the whole government and are shown apart from its own spending:
  the Service-Wide Vote (Budget and Economic Planning) and debt service through the Debt Management Office.
"""
import json
import re
import sys
from collections import defaultdict

import fitz

PDF, NODES = sys.argv[1], sys.argv[2]
ACT_URL = 'https://budgetoffice.gov.ng/index.php/2026-appropriation-act-details'
PDF_URL = 'https://budgetoffice.gov.ng/index.php/2026-appropriation-act-details/2026-appropriation-act-details-pdf/download'

NUM = re.compile(r'\d{1,3}(?:,\d{3})*|0|-')
START = re.compile(r'^(\d{1,3})\.?\s+(\d{9,10}|\d{4})(?!\d)\s*(.*)$')

# Ministry and office groups (first four digits of a line's code) and the graph node that shows them.
GROUPS = {
    '0111': 'ng-president', '0116': 'ng-ministry-of-defence', '0119': 'ng-ministry-of-foreign-affairs',
    '0123': 'ng-ministry-of-information', '0124': 'ng-ministry-of-interior', '0125': 'ng-ohcsf',
    '0140': 'ng-office-of-the-auditor-general', '0147': 'ng-federal-civil-service-commission',
    '0149': 'ng-federal-character-commission', '0155': 'ng-ministry-of-police-affairs',
    '0156': 'ng-ministry-of-communications', '0157': 'ng-onsa', '0158': 'ng-code-of-conduct-tribunal',
    '0160': 'ng-police-service-commission', '0161': 'ng-office-of-sgf', '0164': 'ng-ministry-of-special-duties',
    '0215': 'ng-ministry-of-agriculture', '0220': 'ng-ministry-of-finance', '0222': 'ng-ministry-of-industry',
    '0227': 'ng-ministry-of-labour', '0228': 'ng-ministry-of-science', '0229': 'ng-ministry-of-transportation',
    '0230': 'ng-ministry-of-aviation', '0231': 'ng-ministry-of-power', '0232': 'ng-ministry-of-petroleum',
    '0233': 'ng-ministry-of-steel', '0234': 'ng-ministry-of-works', '0238': 'ng-ministry-of-budget',
    '0246': 'ng-rmafc', '0252': 'ng-ministry-of-water-resources', '0253': 'ng-ministry-of-housing',
    '0254': 'ng-ministry-of-marine', '0255': 'ng-ministry-of-art-culture-tourism',
    '0256': 'ng-ministry-of-art-culture-tourism', '0257': 'ng-ministry-of-solid-minerals',
    '0265': 'ng-ministry-of-livestock', '0326': 'ng-ministry-of-justice', '0341': 'ng-icpc',
    '0344': 'ng-code-of-conduct-bureau', '0437': 'ng-fct', '0451': 'ng-ministry-of-regional-development',
    '0514': 'ng-ministry-of-women-affairs', '0517': 'ng-ministry-of-education', '0521': 'ng-ministry-of-health',
    '0535': 'ng-ministry-of-environment', '0543': 'ng-national-population-commission',
    '0554': 'ng-ministry-of-humanitarian-affairs', '0555': 'ng-ministry-of-youth',
}

PASS_THROUGH = {
    '0238005002': 'Service-Wide Vote, spent across all of government',
    '0220002001': 'Debt service, paid through the Debt Management Office',
}

# Lines whose names differ from the graph's; checked by hand.
MANUAL = {
    'ng-police': '0155004001', 'ng-ncs-corrections': '0124002001', 'ng-frsc': '0161007001',
    'ng-dss': '0157002001', 'ng-nipc': '0222030001', 'ng-nbc': '0123008001', 'ng-nhia': '0521002001',
    'ng-ncdc': '0521027047', 'ng-rea': '0231003001', 'ng-nuc': '0517020001', 'ng-mco': '0257003001',
    'ng-ngsa': '0257002001', 'ng-nihsa': '0252002001', 'ng-nigerian-air-force': '0116005001',
    'ng-nis': '0124003001',
}
# Name matches that are wrong: an acronym shared by two bodies.
REJECT = {('ng-shippers-council', 'NATIONAL STEEL COUNCIL (NSC)')}


def toint(s):
    return 0 if s == '-' else int(s.replace(',', ''))


def full_code(code):
    """Some codes are printed with a digit missing: '229002001' for 0229002001, '022200100' for 0222001001."""
    if len(code) == 9:
        return '0' + code if not code.startswith('0') else code + '1'
    return code


def parse(pages):
    rows, headers = {}, []
    for i, text in enumerate(pages):
        if i < 31:
            continue
        summary = bool(re.search(r'TOTAL\s*ALLOCATION', text))
        raw = [line.strip() for line in text.split('\n')]
        lines = []
        for line in raw:
            if not line:
                continue
            if lines and re.fullmatch(r'\d{1,3}\.?', lines[-1]) and re.match(r'^\d{4,10}\b', line):
                lines[-1] = lines[-1] + ' ' + line
            else:
                lines.append(line)
        first_header = True
        j = 0
        while j < len(lines):
            m = START.match(lines[j])
            if not m:
                j += 1
                continue
            code, name, nums, k = m.group(2), m.group(3), [], j + 1
            while k < len(lines) and len(nums) < 4:
                parts = lines[k].split()
                if parts and all(NUM.fullmatch(p) for p in parts):
                    nums += parts
                elif not nums:
                    name += ' ' + lines[k]
                else:
                    break
                k += 1
            if len(nums) >= 4:
                p, o, c, t = (toint(x) for x in nums[:4])
                rec = {'code': full_code(code), 'name': ' '.join(name.split()).rstrip(' -'),
                       'personnel': p, 'overhead': o, 'capital': c, 'total': t, 'page': i + 1}
                if len(code) == 4:
                    if summary and first_header:
                        rec['section'] = raw[3] if len(raw) > 3 else ''
                        headers.append(rec)
                    first_header = False
                elif rec['code'] not in rows and (summary or p + o + c == t):
                    rows[rec['code']] = rec
            j = k
    return rows, headers


def norm(s):
    s = s.upper().replace('&', ' AND ').replace('’', "'")
    s = re.sub(r'\bHQTRS?\b|\bHEADQUARTERS\b|\bHQ\b', '', s)
    s = re.sub(r'[^A-Z0-9 ]', ' ', s)
    s = re.sub(r'\bTHE\b|\bOF\b|\bFOR\b|\bAND\b', '', s)
    return ' '.join(s.split())


def title(s):
    """"FEDERAL MINISTRY OF WORKS - HQTRS" -> "Federal Ministry of Works"; acronyms stay in capitals."""
    # A curly apostrophe mis-encoded in the PDF ("JAMAÃ„Â»ARE" for Jama'are).
    s = re.sub(r"[ÃÄÂ»„âã€™]{2,}", "'", s)
    s = re.sub(r'\s*-?\s*H/?QTRS?\.?$', '', s.strip())
    small = {'of', 'and', 'for', 'the', 'in', 'on', 'to', 'at'}
    out = []
    for i, w in enumerate(s.split()):
        core = w.strip('(),.')
        if core in ACRONYMS or (w.startswith('(') and core.isupper()):
            out.append(w)
        elif i and w.lower() in small:
            out.append(w.lower())
        else:
            out.append('-'.join('/'.join(q.capitalize() for q in part.split('/')) for part in w.split('-')))
    return ' '.join(out)


ACRONYMS = {'RBDA', 'NIPOST', 'SMEDAN', 'FCT', 'NYSC', 'OSSAP', 'MDGS', 'ICT', 'NASS', 'NCC', 'UBE', 'PLC'}


def main():
    doc = fitz.open(PDF)
    pages = [doc[i].get_text() for i in range(len(doc))]
    rows, headers = parse(pages)
    for r in rows.values():
        ACRONYMS.update(a for a in re.findall(r'\(([A-Z]{2,6})\)', r['name']))
    nodes = json.load(open(NODES))

    groups = defaultdict(list)
    for code, r in rows.items():
        groups[code[:4]].append(r)
    # The Act's own summary figure for a ministry, found by the page title its lines sit under.
    header_by_group = {}
    for code, g in groups.items():
        pages_of = {r['page'] for r in g}
        for h in headers:
            if h['page'] in pages_of and code not in header_by_group:
                header_by_group[code] = h

    ministries = {}
    for code, node_id in GROUPS.items():
        g = [r for r in groups.get(code, [])]
        if not g:
            continue
        passing = [r for r in g if r['code'] in PASS_THROUGH]
        own = [r for r in g if r['code'] not in PASS_THROUGH]
        h = header_by_group.get(code)
        if h and abs(h['total'] - sum(r['total'] for r in g)) <= max(1, h['total'] // 100):
            base = {k: h[k] for k in ('personnel', 'overhead', 'capital', 'total')}
            basis = 'summary'
        else:
            base = {k: sum(r[k] for r in g) for k in ('personnel', 'overhead', 'capital', 'total')}
            basis = 'lines'
        for r in passing:
            for k in ('personnel', 'overhead', 'capital', 'total'):
                base[k] -= r[k]
        entry = ministries.setdefault(node_id, {'personnel': 0, 'overhead': 0, 'capital': 0, 'total': 0, 'lines': 0, 'page': min(r['page'] for r in g), 'basis': basis, 'largest': [], 'passThrough': []})
        for k in ('personnel', 'overhead', 'capital', 'total'):
            entry[k] += base[k]
        entry['lines'] += len(own)
        entry['largest'] += own
        entry['passThrough'] += [{'label': PASS_THROUGH[r['code']], 'total': r['total']} for r in passing]
        if basis == 'lines':
            entry['basis'] = 'lines'

    # Agencies: exact name (or acronym) matches, plus the hand-checked list.
    index = defaultdict(set)
    for n in nodes:
        for label in [n['name'], *n.get('aliases', [])]:
            index[norm(label)].add(n['id'])
    agencies = {}
    for code, r in sorted(rows.items()):
        name = r['name']
        cands = set()
        for part in [name, *re.findall(r'\(([A-Z][A-Z0-9&]{1,9})\)', name), re.sub(r'\s*\([^)]*\)', '', name)]:
            cands |= index.get(norm(part), set())
        if len(cands) == 1:
            node_id = next(iter(cands))
            if (node_id, name) in REJECT or node_id in agencies or node_id in ministries or node_id.startswith('ng-ministry-of-'):
                continue
            agencies[node_id] = code
    for node_id, code in MANUAL.items():
        if code in rows:
            agencies[node_id] = code

    by_code_node = {code: node_id for node_id, code in agencies.items()}

    def line(r):
        out = {'name': title(r['name']), 'code': r['code'], 'total': r['total'], 'page': r['page']}
        if r['code'] in by_code_node:
            out['nodeId'] = by_code_node[r['code']]
        return out

    print('// Generated by scripts/build-budget-2026.py from the 2026 Appropriation Act. Do not edit by hand.')
    print("import type { AgencyBudget, MinistryBudget } from './budget'")
    print()
    print(f"export const ACT_URL = '{ACT_URL}'")
    print(f"export const ACT_PDF_URL = '{PDF_URL}'")
    print()
    print('export const MINISTRY_BUDGETS: Record<string, MinistryBudget> = {')
    for node_id in sorted(ministries):
        e = ministries[node_id]
        largest = sorted(e['largest'], key=lambda r: -r['total'])[:5]
        body = {
            'personnel': e['personnel'], 'overhead': e['overhead'], 'capital': e['capital'], 'total': e['total'],
            'lines': e['lines'], 'page': e['page'], 'basis': e['basis'],
            'largest': [line(r) for r in largest],
        }
        if e['passThrough']:
            body['passThrough'] = e['passThrough']
        print(f"\t'{node_id}': {json.dumps(body, ensure_ascii=False)},")
    print('}')
    print()
    print('export const AGENCY_BUDGETS: Record<string, AgencyBudget> = {')
    for node_id in sorted(agencies):
        r = rows[agencies[node_id]]
        body = {'name': title(r['name']), 'code': r['code'], 'personnel': r['personnel'], 'overhead': r['overhead'], 'capital': r['capital'], 'total': r['total'], 'page': r['page']}
        if r['code'] in PASS_THROUGH:
            body['passThrough'] = PASS_THROUGH[r['code']]
        print(f"\t'{node_id}': {json.dumps(body, ensure_ascii=False)},")
    print('}')
    print(f'// {len(rows)} lines read; {len(ministries)} ministries and offices, {len(agencies)} agencies matched.', file=sys.stderr)


main()
