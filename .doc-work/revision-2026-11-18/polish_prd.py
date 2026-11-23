from pathlib import Path
from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
import hashlib,json
root=Path.cwd(); work=root/'.doc-work/revision-2026-11-18'
old={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (work/'render').glob('page-*.png')}
(work/'render-before.json').write_text(json.dumps(old),encoding='utf-8')
path=root/'Claude outputs/PRD-WebEdukasi-Anatomi.docx'
doc=Document(path)
removed=0
for parent in [doc.element,doc.styles.element]:
    for border in list(parent.iter(qn('w:pBdr'))):
        border.getparent().remove(border); removed+=1
# Explicitly suppress inherited title borders.
pr=doc.styles['Title'].element.get_or_add_pPr()
borders=OxmlElement('w:pBdr')
for edge in ['top','left','bottom','right','between']:
    item=OxmlElement('w:'+edge); item.set(qn('w:val'),'nil'); borders.append(item)
pr.append(borders)
for p in doc.paragraphs:
    if p.style.name=='Title':
        pp=p._p.get_or_add_pPr()
        import copy
        pp.append(copy.deepcopy(borders))
doc.save(path)
print('Removed paragraph borders:',removed)
