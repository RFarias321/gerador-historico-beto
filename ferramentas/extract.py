import xml.etree.ElementTree as ET, json, re, sys, colorsys
NS={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
M='{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
def colnum(s):
    n=0
    for ch in s: n=n*26+ord(ch)-64
    return n
def extract(d):
    ss=[]
    for si in ET.parse(d+'/xl/sharedStrings.xml').getroot().findall('m:si',NS):
        ss.append(''.join(t.text or '' for t in si.iter(M+'t')))
    th=open(d+'/xl/theme/theme1.xml').read()
    tc={}
    for k in ['dk1','lt1','dk2','lt2','accent1','accent2','accent3','accent4','accent5','accent6']:
        m=re.search(r'<a:%s>.*?(?:lastClr|val)="([0-9A-F]{6})"'%k,th); tc[k]=m.group(1)
    theme=[tc['lt1'],tc['dk1'],tc['lt2'],tc['dk2']]+[tc['accent%d'%i] for i in range(1,7)]
    def color(el):
        if el is None: return None
        if el.get('rgb'): return el.get('rgb')[-6:]
        if el.get('theme') is not None:
            c=theme[int(el.get('theme'))]; t=float(el.get('tint','0'))
            if t:
                r,g,b=[int(c[i:i+2],16)/255 for i in (0,2,4)]
                h,l,s=colorsys.rgb_to_hls(r,g,b)
                l = l*(1+t) if t<0 else l*(1-t)+t
                r,g,b=colorsys.hls_to_rgb(h,l,s); c='%02X%02X%02X'%(round(r*255),round(g*255),round(b*255))
            return c
        if el.get('indexed'): return {'64':'000000','8':'000000','9':'FFFFFF'}.get(el.get('indexed'),'000000')
        return None
    st=ET.parse(d+'/xl/styles.xml').getroot()
    numfmts={nf.get('numFmtId'):nf.get('formatCode') for nf in st.iter(M+'numFmt')}
    fonts=[]
    for f in st.find('m:fonts',NS):
        fonts.append(dict(sz=float(f.find('m:sz',NS).get('val')),b=f.find('m:b',NS) is not None,i=f.find('m:i',NS) is not None,u=f.find('m:u',NS) is not None,color=color(f.find('m:color',NS)) or '000000'))
    fills=[]
    for f in st.find('m:fills',NS):
        p=f.find('m:patternFill',NS)
        fills.append(color(p.find('m:fgColor',NS)) if p is not None and p.get('patternType')=='solid' else None)
    borders=[]
    for b in st.find('m:borders',NS):
        bd={}
        for side in ['left','right','top','bottom']:
            e=b.find('m:'+side,NS)
            if e is not None and e.get('style'): bd[side[0]]=[e.get('style'),color(e.find('m:color',NS)) or '000000']
        borders.append(bd)
    styles=[]
    for xf in st.find('m:cellXfs',NS):
        a=xf.find('m:alignment',NS)
        nid=xf.get('numFmtId','0')
        styles.append(dict(font=fonts[int(xf.get('fontId',0))],fill=fills[int(xf.get('fillId',0))],border=borders[int(xf.get('borderId',0))],
          h=a.get('horizontal') if a is not None else None, v=a.get('vertical','bottom') if a is not None else 'bottom',
          wrap=(a is not None and a.get('wrapText')=='1'), indent=int(a.get('indent','0')) if a is not None else 0,
          numFmtId=int(nid), fmt=numfmts.get(nid)))
    sh=open(d+'/xl/worksheets/sheet1.xml').read()
    root=ET.fromstring(sh)
    cols=[]
    for c in root.find('m:cols',NS): cols.append(dict(min=int(c.get('min')),max=int(c.get('max')),width=float(c.get('width')),style=c.get('style')))
    rows={}
    for r in root.find('m:sheetData',NS):
        rn=int(r.get('r')); cells=[]
        for c in r.findall('m:c',NS):
            ref=c.get('r'); col=colnum(re.match(r'[A-Z]+',ref).group(0))
            v=c.find('m:v',NS); t=c.get('t'); val=None
            if v is not None:
                if t=='s': val=ss[int(v.text)]
                elif t in ('str','e'): val=v.text
                else: val=float(v.text)
            cell=dict(c=col,s=int(c.get('s','0')))
            if val is not None: cell['v']=val
            if c.get('vm'): cell['vm']=c.get('vm'); cell['t']='e'
            cells.append(cell)
        rows[rn]=dict(ht=float(r.get('ht')) if r.get('customHeight') else None,cells=cells)
    merges=[m.get('ref') for m in root.iter(M+'mergeCell')]
    head=sh[:sh.index('<sheetData')]
    tail=sh[sh.index('</sheetData>')+len('</sheetData>'):]
    tail=re.sub(r'<sortState.*?</sortState>','',tail)
    tail=re.sub(r'<mergeCells.*?</mergeCells>','{{MERGES}}',tail)
    head=re.sub(r'<dimension ref="[^"]*"/>','<dimension ref="{{DIM}}"/>',head)
    head=re.sub(r'<sheetViews>.*?</sheetViews>','<sheetViews><sheetView showGridLines="0" tabSelected="1" view="pageBreakPreview" zoomScale="100" zoomScaleNormal="100" zoomScaleSheetLayoutView="100" workbookViewId="0"><selection activeCell="A1" sqref="A1"/></sheetView></sheetViews>',head)
    pageSetup=re.search(r'<pageMargins left="([\d.]+)" right="([\d.]+)" top="([\d.]+)" bottom="([\d.]+)"',tail).groups()
    return dict(styles=styles,cols=cols,rows=rows,merges=merges,head=head,tail=tail,margins=[float(x) for x in pageSetup])
json.dump(extract(sys.argv[1]),open(sys.argv[2],'w'),ensure_ascii=False)
