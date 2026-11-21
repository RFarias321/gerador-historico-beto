"""Gera cópias fictícias de planilhas do Conexão para os testes automáticos.
Troca nomes de alunos e pais, matrículas e datas de nascimento por dados inventados,
de forma consistente entre todos os arquivos (o mesmo aluno recebe o mesmo nome falso).
Uso: python3 -I anonimizar.py SAIDA arquivo1.xlsx arquivo2.xlsx ...
"""
import sys, os, re, zipfile, html, unicodedata, itertools

out_dir = sys.argv[1]
srcs = sys.argv[2:]
os.makedirs(out_dir, exist_ok=True)

def norm(s):
    return unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().upper()

def texts_by_row(xml, shared):
    rows = []
    for rm in re.finditer(r'<row\b[^>]*>(.*?)</row>', xml, re.S):
        cells = []
        for cm in re.finditer(r'<c\b([^>]*?)(?:/>|>(.*?)</c>)', rm.group(1), re.S):
            attrs, body = cm.group(1), cm.group(2) or ''
            t = ''
            if 't="s"' in attrs:
                v = re.search(r'<v>(\d+)</v>', body)
                if v: t = shared[int(v.group(1))]
            elif 'inlineStr' in attrs:
                t = ''.join(html.unescape(x) for x in re.findall(r'<t[^>]*>(.*?)</t>', body, re.S))
            else:
                v = re.search(r'<v>(.*?)</v>', body)
                if v: t = v.group(1)
            if t.strip(): cells.append(t.strip())
        rows.append(cells)
    return rows

def read_book(path):
    z = zipfile.ZipFile(path)
    shared = []
    if 'xl/sharedStrings.xml' in z.namelist():
        sx = z.read('xl/sharedStrings.xml').decode('utf8')
        for si in re.findall(r'<si>(.*?)</si>', sx, re.S):
            shared.append(''.join(html.unescape(x) for x in re.findall(r'<t[^>]*>(.*?)</t>', si, re.S)))
    sheets = {n: z.read(n).decode('utf8') for n in z.namelist() if n.startswith('xl/worksheets/sheet')}
    return z, shared, sheets

names, mats, dates = set(), set(), set()
LABELS = [r'NOME DO ALUNO\s*:', r'PAI\s*:', r'M[ÃA]E\s*:', r'NOME\s*:']
for p in srcs:
    z, shared, sheets = read_book(p)
    for xml in sheets.values():
        for cells in texts_by_row(xml, shared):
            joined = '  '.join(cells)
            # ata: matrícula seguida do nome
            for i, c in enumerate(cells):
                if re.fullmatch(r'\d{10,15}', c):
                    mats.add(c)
                    if i + 1 < len(cells) and re.search(r'[A-Za-zÀ-ú]{2,}\s+[A-Za-zÀ-ú]{2,}', cells[i + 1]):
                        names.add(cells[i + 1].strip())
            for lab in LABELS:
                for m in re.finditer(lab + r'\s*(.*?)(?=\s{2,}|$|DATA DE|N[ºo°]\s*:|SEXO)', joined):
                    v = m.group(1).strip(' :')
                    if re.search(r'[A-Za-zÀ-ú]{2,}\s+[A-Za-zÀ-ú]{2,}', v): names.add(v)
            for m in re.finditer(r'DATA DE NASCIMENTO\s*:\s*(\d{2}/\d{2}/\d{4})', joined):
                dates.add(m.group(1))
            for m in re.finditer(r'\b(\d{10,15})\b', joined):
                mats.add(m.group(1))

names = sorted({n for n in names if len(n) > 5}, key=len, reverse=True)
import random
_rng = random.Random(1892)
_sil = ['BA', 'BE', 'BO', 'CA', 'DE', 'DU', 'FA', 'FI', 'GA', 'LO', 'LU', 'MA', 'ME', 'NI', 'NO', 'PA', 'RI', 'RO', 'SA', 'TA', 'TO', 'VA', 'VI', 'ZE', 'ZU']
_used = set()
def _word():
    while True:
        w = ''.join(_rng.choice(_sil) for _ in range(3)) + _rng.choice(['N', 'R', 'S', 'L', ''])
        if w not in _used: _used.add(w); return w
def _gen():
    while True: yield f'{_word()} {_word()} {_word()}'
gen = _gen()
name_map = {}
for n in names:
    key = norm(n)
    if key not in name_map: name_map[key] = next(gen)
mat_map = {}
for i, m in enumerate(sorted(mats)):
    fake = ('9' + str(100000000000000 + i * 7919))[:len(m)]
    mat_map[m] = fake
date_map = {d: f'{(i % 27) + 1:02d}/{(i % 12) + 1:02d}/200{i % 9}' for i, d in enumerate(sorted(dates))}

def fix_text(t):
    changed = True
    while changed:
        changed = False
        nt, idx = '', []
        for i, ch in enumerate(t):
            n = norm(ch)
            for c in n: nt += c; idx.append(i)
        ntc = re.sub(r'\s', ' ', nt)
        for key, fake in name_map.items():
            k = re.sub(r'\s+', ' ', key)
            j = ntc.find(k)
            if j >= 0:
                s0, s1 = idx[j], idx[j + len(k) - 1] + 1
                t = t[:s0] + fake + t[s1:]
                changed = True
                break
    for m, fake in mat_map.items(): t = t.replace(m, fake)
    for d, fake in date_map.items(): t = t.replace(d, fake)
    return t

def fix_xml_text(xml):
    def rep_t(m):
        return m.group(1) + html.escape(fix_text(html.unescape(m.group(2))), quote=False) + m.group(3)
    xml = re.sub(r'(<t(?:\s[^>]*)?>)(.*?)(</t>)', rep_t, xml, flags=re.S)
    xml = re.sub(r'(<v>)(\d{10,15})(</v>)', lambda m: m.group(1) + mat_map.get(m.group(2), m.group(2)) + m.group(3), xml)
    return xml

for i, p in enumerate(srcs):
    z = zipfile.ZipFile(p)
    base = re.sub(r'^[0-9a-f]{8}-', '', os.path.basename(p))
    dst = os.path.join(out_dir, base)
    with zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as w:
        for item in z.infolist():
            data = z.read(item.filename)
            if item.filename.endswith('.xml') and (item.filename.startswith('xl/worksheets/') or item.filename == 'xl/sharedStrings.xml'):
                data = fix_xml_text(data.decode('utf8')).encode('utf8')
            elif item.filename == 'xl/workbook.xml':
                txt = data.decode('utf8')
                txt = re.sub(r'<mc:AlternateContent.*?</mc:AlternateContent>', '', txt, flags=re.S)
                txt = re.sub(r'<x15ac:absPath[^>]*/>', '', txt)
                data = fix_text(txt).encode('utf8')
            elif item.filename.startswith('docProps/core'):
                data = re.sub(rb'<cp:lastModifiedBy>.*?</cp:lastModifiedBy>|<dc:creator>.*?</dc:creator>', b'', data)
            w.writestr(item, data)
print('nomes trocados:', len(name_map), '| matrículas:', len(mat_map), '| datas:', len(date_map))
# lista de verificação (fica fora do repositório)
with open(os.path.join(out_dir, '..', 'segredos_verificar.txt'), 'w') as f:
    for n in names: f.write('N\t' + n + '\n')
    for m in mats: f.write('M\t' + m + '\n')
    for d in dates: f.write('D\t' + d + '\n')
