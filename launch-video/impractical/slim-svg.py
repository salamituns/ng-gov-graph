"""Slims a captured wheel SVG without changing its pixels: drops style values that equal the default or the
parent's (inherited props), turns rgb() into hex, rounds coordinates to 0.1px, removes invisible nodes."""
import re, sys
from xml.etree import ElementTree as ET
ET.register_namespace('', 'http://www.w3.org/2000/svg')
INHERIT = {'fill','stroke','stroke-width','stroke-dasharray','stroke-linecap','font-family','font-size','font-weight','letter-spacing','text-anchor','visibility','fill-opacity','stroke-opacity'}
DEFAULT = {'fill':'#000000','stroke':'none','stroke-width':'1px','stroke-dasharray':'none','stroke-linecap':'butt','opacity':'1','fill-opacity':'1','stroke-opacity':'1','display':'inline','visibility':'visible','letter-spacing':'normal','text-anchor':'start','font-weight':'400'}
TEXTY = {'font-family','font-size','font-weight','letter-spacing','text-anchor'}
def hexify(v):
    def rep(m):
        parts=[float(x) for x in m.group(1).split(',')]
        if len(parts)==4 and parts[3]==0: return 'transparent'
        h='#%02x%02x%02x'%tuple(int(round(x)) for x in parts[:3])
        return h if len(parts)==3 or parts[3]==1 else f'{h}{int(round(parts[3]*255)):02x}'
    # color(srgb r g b [/ a]) (what color-mix() computes to) is 0..1 floats; convert it to hex first,
    # because "srgb" contains "rgb" and must not reach the rgb() handling below.
    def srgb(m):
        parts = m.group(1).replace('/', ' ').split()
        rgb = '#%02x%02x%02x' % tuple(int(round(float(x) * 255)) for x in parts[:3])
        return rgb if len(parts) < 4 or float(parts[3]) == 1 else f'{rgb}{int(round(float(parts[3]) * 255)):02x}'
    v = re.sub(r'color\(srgb ([^)]*)\)', srgb, v)
    return re.sub(r'rgba?\(([^)]*)\)', rep, v) if re.search(r'(?<!s)rgba?\(', v) else v
num = re.compile(r'-?\d+\.\d{2,}')
def rnd(s): return num.sub(lambda m: (f'{float(m.group()):.1f}').rstrip('0').rstrip('.'), s)
def parse(style): return dict(kv.split(':',1) for kv in style.split(';') if ':' in kv)
def walk(el, inherited, texty_ok):
    tag = el.tag.split('}')[-1]
    st = {k: hexify(v.strip()) for k, v in parse(el.get('style','')).items()}
    if st.get('display') == 'none' or st.get('visibility') == 'hidden' or st.get('opacity') == '0':
        return False
    keep = {}
    for k, v in st.items():
        if k in TEXTY and tag not in ('text','tspan','textPath','svg','g'): continue
        base = inherited.get(k, DEFAULT.get(k))
        if k in INHERIT and v == base: continue
        if k not in INHERIT and v == DEFAULT.get(k): continue
        keep[k] = v
    child_inh = dict(inherited); child_inh.update({k: v for k, v in st.items() if k in INHERIT})
    if keep: el.set('style', ';'.join(f'{k}:{v}' for k, v in keep.items()))
    elif 'style' in el.attrib: del el.attrib['style']
    for a in ('d','points','transform','x','y','cx','cy','r','x1','y1','x2','y2','width','height','rx','ry','viewBox'):
        if a in el.attrib: el.set(a, rnd(el.get(a)))
    for a in [a for a in el.attrib if a.startswith('aria-') or a.startswith('data-') or a in ('id',)]:
        if a == 'id' and tag in ('path',) and el.getparent if False else False: pass
    for c in list(el):
        if walk(c, child_inh, texty_ok) is False: el.remove(c)
    return True
src, dst = sys.argv[1], sys.argv[2]
tree = ET.parse(src); root = tree.getroot()
walk(root, {}, True)
# Keep the film's targets addressable before the aria labels go: data-obj names what the camera and cursor aim at.
TARGETS = {'President of the Federal Republic of Nigeria': 'PRESIDENT', 'Lagos State': 'LAGOS'}
for el in root.iter():
    label = el.get('aria-label')
    if label in TARGETS: el.set('data-obj', TARGETS[label])
    for a in [a for a in el.attrib if a.startswith('aria-')]: del el.attrib[a]
out = ET.tostring(root, encoding='unicode').replace('ns0:','').replace(':ns0','')
out = re.sub(r'\s+', ' ', out)
# An SVG loaded through <img> renders only with its namespace declared; the default-namespace export drops it.
if 'xmlns=' not in out[:200]: out = out.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ', 1)
open(dst,'w').write(out)
print(dst, f'{len(out)/1024:.0f} KB')
