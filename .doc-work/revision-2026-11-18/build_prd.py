from pathlib import Path
from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
import json
root=Path.cwd()
source=root/'.doc-work/revision-2026-11-18/prd-source.md'
out=root/'Claude outputs/PRD-WebEdukasi-Anatomi.docx'
doc=Document()
sec=doc.sections[0]
sec.page_width,sec.page_height=Cm(21),Cm(29.7)
sec.top_margin,sec.bottom_margin=Cm(1.8),Cm(1.8)
sec.left_margin,sec.right_margin=Cm(2),Cm(2)
for name in ['Normal','Title','Subtitle','Heading 1','Heading 2','List Bullet']:
    st=doc.styles[name]
    st.font.name='Calibri'
    st.font.color.rgb=RGBColor(0,0,0)
    st.paragraph_format.widow_control=True
normal=doc.styles['Normal']
normal.font.size=Pt(10.5)
normal.paragraph_format.line_spacing=1.12
normal.paragraph_format.space_after=Pt(7)
for name,size in [('Title',25),('Heading 1',18),('Heading 2',12)]:
    st=doc.styles[name]
    st.font.size=Pt(size)
    st.font.bold=True
    st.paragraph_format.space_before=Pt(9)
    st.paragraph_format.space_after=Pt(7)
    st.paragraph_format.keep_with_next=True
for line in source.read_text(encoding='utf-8-sig').splitlines():
    if not line.strip(): continue
    if line=='[[PAGE]]': doc.add_page_break()
    elif line.startswith('# '): doc.add_paragraph(line[2:],'Title')
    elif line.startswith('## '): doc.add_paragraph(line[3:],'Heading 1')
    elif line.startswith('### '): doc.add_paragraph(line[4:],'Heading 2')
    elif line.startswith('- '): doc.add_paragraph(line[2:],'List Bullet')
    else: doc.add_paragraph(line)
p=sec.footer.paragraphs[0]
p.alignment=2
r=p.add_run(); r.font.size=Pt(9)
fld=OxmlElement('w:fldSimple'); fld.set(qn('w:instr'),'PAGE'); r._r.addnext(fld)
doc.core_properties.title='PRD WebEdukasi Anatomi'
doc.core_properties.subject='Ruang belajar sistem interaktif berbahasa Indonesia'
doc.core_properties.author='WebEdukasi'
doc.core_properties.version='2.0'
doc.save(out)
check=Document(out)
assert len(check.paragraphs)>90
text='\n'.join(p.text for p in check.paragraphs).lower()
for required in ['bahasa indonesia','scroll tidak','tahap c','gagasan','resolver']:
    assert required in text,required
print(json.dumps({'file':str(out),'paragraphs':len(check.paragraphs),'planned_sections':9,'design_bytes':(root/'Design.md').stat().st_size}))
