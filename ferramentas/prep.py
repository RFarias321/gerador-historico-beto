import json, re, os, shutil, zipfile, io, sys, unicodedata
import xml.etree.ElementTree as ET
from PIL import Image
sys.path.insert(0,'build')
B='build'; OUT='site'; os.makedirs(OUT,exist_ok=True)
M='{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
NS={'m':M[1:-1]}

def rich_strings(d):
    res=[]
    for si in ET.parse(d+'/xl/sharedStrings.xml').getroot().findall('m:si',NS):
        runs=si.findall('m:r',NS)
        if not runs: res.append(None); continue
        rr=[]
        for r in runs:
            rpr=r.find('m:rPr',NS)
            t=''.join(x.text or '' for x in r.iter(M+'t'))
            f={}
            raw=''
            if rpr is not None:
                raw=ET.tostring(rpr,encoding='unicode').replace('ns0:','').replace(':ns0','').replace(' xmlns="%s"'%M[1:-1],'')
                raw=re.sub(r'\sxmlns(:\w+)?="[^"]*"','',raw)
                f=dict(b=rpr.find('m:b',NS) is not None,i=rpr.find('m:i',NS) is not None)
                sz=rpr.find('m:sz',NS)
                if sz is not None: f['sz']=float(sz.get('val'))
            res.append({'t':t,'f':f,'rpr':raw})
            res[-1:]=[res[-1]] if False else res[-1:]
        res[-len(runs):]=[res[-len(runs):]]
    return res

def fix_rich(d):
    out=[]
    for si in ET.parse(d+'/xl/sharedStrings.xml').getroot().findall('m:si',NS):
        runs=si.findall('m:r',NS)
        if not runs: out.append(None); continue
        rr=[]
        for r in runs:
            rpr=r.find('m:rPr',NS); t=''.join(x.text or '' for x in r.iter(M+'t'))
            raw=''; f={}
            if rpr is not None:
                raw=ET.tostring(rpr,encoding='unicode')
                raw=re.sub(r'</?ns0:','<',raw).replace('<rPr','<rPr').replace('<','<')
                raw=re.sub(r'<(/?)ns0:',r'<\1',ET.tostring(rpr,encoding='unicode'))
                raw=re.sub(r'\sxmlns(:\w+)?="[^"]*"','',raw)
                f=dict(b=rpr.find('m:b',NS) is not None,i=rpr.find('m:i',NS) is not None)
                sz=rpr.find('m:sz',NS)
                if sz is not None: f['sz']=float(sz.get('val'))
            rr.append({'t':t,'f':f,'rpr':raw})
        out.append(rr)
    return out

def sst_index(d):
    # map text->rich runs
    rich=fix_rich(d)
    sis=ET.parse(d+'/xl/sharedStrings.xml').getroot().findall('m:si',NS)
    return {''.join(x.text or '' for x in si.iter(M+'t')):rich[i] for i,si in enumerate(sis) if rich[i]}

FIX={'HISTORICO ESCOLAR':'HISTÓRICO ESCOLAR','MUNICIPIO: ':'MUNICÍPIO: ','ORGÃO EXPEDIDOR:':'ÓRGÃO EXPEDIDOR:',
 'Secretario Essolar ':'Secretário Escolar','Prof Jayme Nunes Jr':'Prof. Jayme Nunes Jr','REP FREQ = Reprovado por frequencia':'REP FREQ = Reprovado por frequência',
 'Legenda :':'Legenda:','(***) Conforme os termos do artigo 8º da  Resolução SEEDUC Nº 5879 de 13 de outubro de 2020.':'(***) Conforme os termos do artigo 8º da Resolução SEEDUC Nº 5879 de 13 de outubro de 2020.',
 '(**) Projeto definido pela unidade escolar obrigatória aos alunos que não optaram pelas disciplinas de matrícula facultativa. ':'(**) Projeto definido pela unidade escolar, obrigatório aos alunos que não optaram pelas disciplinas de matrícula facultativa.'}

def norm(s):
    s=unicodedata.normalize('NFD',s.upper()); return re.sub(r'[^A-Z0-9]','',''.join(c for c in s if unicodedata.category(c)!='Mn'))

for key,d,ncols,lastcol in [('eja','x_eja',4,12),('reg','x_reg',3,10)]:
    raw=json.load(open(f'{B}/raw_{key}.json'))
    rich=sst_index(d)
    rows=raw['rows']
    for rn,row in rows.items():
        for c in row['cells']:
            v=c.get('v')
            if isinstance(v,str):
                if v in rich:
                    c['runs']=[dict(r) for r in rich[v]]
                    for r in c['runs']:
                        if r['t']==' Brasiliera': r['t']=' Brasileira'
                    del c['v']
                    continue
                if v=='#VALUE!': continue
                v=v.rstrip('\n') if v.startswith('Histórico escolar') else v
                c['v']=FIX.get(v,v)
    # defaults CH and subject order
    order=[];defch={}
    for r in range(31,51):
        cells={c['c']:c for c in rows[str(r)]['cells']}
        name=cells[2]['v']; order.append(name)
        defch[norm(name)]=[cells.get(4+2*i,{}).get('v') for i in range(ncols)]
    # clean rows 
    if key=='reg':
        for r in ['61','62','63','64','65','66']:
            rows[r]['cells']=[c for c in rows[r]['cells'] if c['c']<=9]
        for c in rows['68']['cells']:
            c.pop('v',None)
        merges=[m for m in raw['merges'] if m!='C68:D68']
        merges=[re.sub(r'^B(6[1-5]):K\1$',r'B\1:I\1',m) for m in merges]
    else:
        merges=raw['merges']
    raw['merges']=merges
    raw['order']=order; raw['defch']=defch; raw['ncols']=ncols; raw['lastcol']=lastcol
    json.dump(raw,open(f'{OUT}/spec_{key}.json','w'),ensure_ascii=False,separators=(',',':'))

# logo
im=Image.open('x_eja/xl/media/image1.png'); im=im.resize((700,round(700*im.height/im.width)),Image.LANCZOS)
buf=io.BytesIO(); im.save(buf,'PNG',optimize=True); logo=buf.getvalue(); print('logo',len(logo))

def pack(src,dst,drop=(),replace={}):
    zi=zipfile.ZipFile(src); zo=zipfile.ZipFile(dst,'w',zipfile.ZIP_DEFLATED)
    for n in zi.namelist():
        if n in drop: continue
        data=replace.get(n, zi.read(n))
        if isinstance(data,str): data=data.encode()
        zo.writestr(n,data)
    zo.close()
pack('in/4af3c6a2-Modelo_Base_de_Hist_rio_EJA__IMPRESSAO.xlsx',f'{OUT}/modelo_eja.xlsx',replace={'xl/media/image1.png':logo})
src='in/32176262-Modelo_Base_de_Hist_rio_Regular_IMPRESSAO.xlsx'
z=zipfile.ZipFile(src)
wb=z.read('xl/workbook.xml').decode()
wb=re.sub(r'<sheets>.*?</sheets>','<sheets><sheet name="Historico" sheetId="2" r:id="rId1"/></sheets>',wb)
wb=re.sub(r'<definedNames>.*?</definedNames>','<definedNames><definedName name="_xlnm.Print_Area" localSheetId="0">Historico!$A$1:$J$88</definedName></definedNames>',wb)
rels=z.read('xl/_rels/workbook.xml.rels').decode()
rels=re.sub(r'<Relationship Id="rId[234]" [^>]*worksheets/sheet[234]\.xml"/>','',rels)
ct=z.read('[Content_Types].xml').decode()
ct=re.sub(r'<Override PartName="/xl/worksheets/sheet[234]\.xml"[^>]*/>','',ct)
app=zipfile.ZipFile('in/4af3c6a2-Modelo_Base_de_Hist_rio_EJA__IMPRESSAO.xlsx').read('docProps/app.xml')
drop=[f'xl/worksheets/sheet{i}.xml' for i in (2,3,4)]+[f'xl/worksheets/_rels/sheet{i}.xml.rels' for i in (2,3,4)]+[f'xl/printerSettings/printerSettings{i}.bin' for i in (2,3,4)]
ct=ct.replace('<Default Extension="bin"','<Default Extension="bin"')
pack(src,f'{OUT}/modelo_reg.xlsx',drop=drop,replace={'xl/workbook.xml':wb,'xl/_rels/workbook.xml.rels':rels,'[Content_Types].xml':ct,'docProps/app.xml':app,'xl/media/image1.png':logo})
print(os.listdir(OUT))

# corrige coluna do 2º módulo no EJA (formato e mesclagens iguais às demais)
sp=json.load(open(f'{OUT}/spec_eja.json'))
for r in list(range(30,51))+[53,54]:
    cells={c['c']:c for c in sp['rows'][str(r)]['cells']}
    cells[5]['s']=cells[3]['s']; cells[6]['s']=cells[4]['s']
for m in ['E53:F53','E54:F54']:
    if m not in sp['merges']: sp['merges'].append(m)
json.dump(sp,open(f'{OUT}/spec_eja.json','w'),ensure_ascii=False,separators=(',',':'))
print('eja fixed')

# ---- limpeza de dados pessoais dos pacotes-modelo e da spec ----
SST='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="0" uniqueCount="0"/>'
STUB_SHEET='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData/></worksheet>'
CORE='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Histórico Escolar</dc:title></cp:coreProperties>'
import re as _re
for k in ['eja','reg']:
    src=f'{OUT}/modelo_{k}.xlsx'; data=open(src,'rb').read()
    zi=zipfile.ZipFile(io.BytesIO(data)); out=io.BytesIO(); zo=zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED)
    for n in zi.namelist():
        b=zi.read(n)
        if n=='xl/sharedStrings.xml': b=SST.encode()
        elif n=='xl/worksheets/sheet1.xml': b=STUB_SHEET.encode()
        elif n=='docProps/core.xml': b=CORE.encode()
        elif n=='xl/workbook.xml': b=_re.sub(rb'<mc:AlternateContent.*?</mc:AlternateContent>',b'',b)
        zo.writestr(n,b)
    zo.close(); open(src,'wb').write(out.getvalue())
    sp=json.load(open(f'{OUT}/spec_{k}.json'))
    for r in range(20,27):
        for c in sp['rows'].get(str(r),{'cells':[]})['cells']:
            if 'runs' in c and len(c['runs'])>1 and r in (22,26): c['runs'][-1]['t']=' '
            elif c['c']!=2 and 'v' in c and c['v'] not in ('e',) and not str(c['v']).isupper() or (r==20 and c['c']==3) or (c.get('v') in ('2023 5555 5555','DETRAN / RJ')):
                if c['c']!=2 and str(c.get('v','')).strip(': ') not in ('NATURALIDADE','ORGÃO EXPEDIDOR','ÓRGÃO EXPEDIDOR','Nº MATRÍCULA','DATA DE NASCIMENTO','DATA DE EXPEDIÇÃO'): c.pop('v',None)
    json.dump(sp,open(f'{OUT}/spec_{k}.json','w'),ensure_ascii=False,separators=(',',':'))
print('limpo')
