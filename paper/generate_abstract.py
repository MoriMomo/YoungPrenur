import os
from PIL import Image
import docx
from docx.shared import Cm, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import qn, nsdecls
import win32com.client

WORKSPACE = r"d:\pasti_berhasil\codee\Kuliah\Lombadll\youngprenur\paper"
LOGO_RIGHT_SRC = r"C:\Users\kenta\.gemini\antigravity\brain\64026e6e-5b3b-45cd-b6ad-183386d50a63\.user_uploaded\media_1794754338761_a472713a.jpg"
LOGO_LEFT_SRC = r"C:\Users\kenta\.gemini\antigravity\brain\64026e6e-5b3b-45cd-b6ad-183386d50a63\.user_uploaded\media_1794754347292_67f34a89.jpg"

def prepare_logo(src_path, dst_path, threshold=242):
    img = Image.open(src_path).convert("RGBA")
    datas = img.getdata()
    new_data = []
    for item in datas:
        if item[0] >= threshold and item[1] >= threshold and item[2] >= threshold:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
    img.putdata(new_data)
    bbox = img.getbbox()
    if bbox:
        pad = 8
        left = max(0, bbox[0] - pad)
        top = max(0, bbox[1] - pad)
        right = min(img.width, bbox[2] + pad)
        bottom = min(img.height, bbox[3] + pad)
        img = img.crop((left, top, right, bottom))
    bg = Image.new("RGB", img.size, (255, 255, 255))
    bg.paste(img, mask=img.split()[3])
    bg.save(dst_path, "PNG", dpi=(300, 300))
    return dst_path

def set_cell_Borders(cell, **kwargs):
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = tcPr.first_child_found_in("w:tcBorders")
    if tcBorders is None:
        tcBorders = OxmlElement('w:tcBorders')
        tcPr.append(tcBorders)
    for edge in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        edge_data = kwargs.get(edge)
        if edge_data:
            tag = 'w:{}'.format(edge)
            element = tcBorders.find(qn(tag))
            if element is None:
                element = OxmlElement(tag)
                tcBorders.append(element)
            for key in ["val", "color", "sz", "space"]:
                if key in edge_data:
                    element.set(qn('w:{}'.format(key)), str(edge_data[key]))

def set_cell_margins(cell, top=40, bottom=40, left=80, right=80):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_cell_shading(cell, color_hex):
    shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading)

def set_run_font(run, size_pt=12, bold=False, italic=False, color=RGBColor(0, 0, 0)):
    run.font.name = "Times New Roman"
    rPr = run._element.get_or_add_rPr()
    rPr.rFonts.set(qn('w:eastAsia'), 'Times New Roman')
    rPr.rFonts.set(qn('w:ascii'), 'Times New Roman')
    rPr.rFonts.set(qn('w:hAnsi'), 'Times New Roman')
    rPr.rFonts.set(qn('w:cs'), 'Times New Roman')
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = color
    run.font.size = Pt(size_pt)

def format_paragraph(p, align=WD_ALIGN_PARAGRAPH.JUSTIFY, line_spacing=1.5, space_before=0, space_after=0, keep_with_next=False):
    p.alignment = align
    pf = p.paragraph_format
    pf.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    pf.line_spacing = line_spacing
    pf.space_before = Pt(space_before)
    pf.space_after = Pt(space_after)
    pf.keep_with_next = keep_with_next

def build_docx():
    logo_left_path = prepare_logo(LOGO_LEFT_SRC, os.path.join(WORKSPACE, "logo_sre_unair.png"), threshold=235)
    logo_right_path = prepare_logo(LOGO_RIGHT_SRC, os.path.join(WORKSPACE, "logo_csbcc.png"), threshold=242)

    doc = docx.Document()

    # Configure Normal Style to Times New Roman 12pt with zero default paragraph spacing
    style = doc.styles['Normal']
    style.font.name = 'Times New Roman'
    style.font.size = Pt(12)
    style.font.color.rgb = RGBColor(0, 0, 0)
    style.paragraph_format.space_before = Pt(0)
    style.paragraph_format.space_after = Pt(0)
    style.paragraph_format.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    style.paragraph_format.line_spacing = 1.5

    # Configure A4 & Official Margins: Left 4.0 cm, Top/Bottom/Right 2.0 cm
    section = doc.sections[0]
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)
    section.left_margin = Cm(4.0)
    section.right_margin = Cm(2.0)
    section.top_margin = Cm(2.0)
    section.bottom_margin = Cm(2.0)
    section.header_distance = Cm(0.55)
    section.footer_distance = Cm(0.8)

    # Running Header: Dual-cell borderless table with SRE Unair Logo (left) and Catalyst/Ecoton Logo (right)
    header = section.header
    hp0 = header.paragraphs[0]
    hp0.text = ""

    htable = header.add_table(rows=1, cols=2, width=Cm(15.0))
    htable.alignment = WD_TABLE_ALIGNMENT.CENTER
    htable.autofit = False
    htable.columns[0].width = Cm(7.5)
    htable.columns[1].width = Cm(7.5)

    cell_l = htable.cell(0, 0)
    cell_r = htable.cell(0, 1)
    cell_l.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    cell_r.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    no_border = {"val": "nil"}
    for c in (cell_l, cell_r):
        set_cell_Borders(c, top=no_border, left=no_border, bottom=no_border, right=no_border)
        set_cell_margins(c, top=0, bottom=0, left=0, right=0)

    pl = cell_l.paragraphs[0]
    format_paragraph(pl, align=WD_ALIGN_PARAGRAPH.LEFT, line_spacing=1.0, space_before=0, space_after=0)
    rl = pl.add_run()
    rl.add_picture(logo_left_path, height=Cm(1.05))

    pr = cell_r.paragraphs[0]
    format_paragraph(pr, align=WD_ALIGN_PARAGRAPH.RIGHT, line_spacing=1.0, space_before=0, space_after=0)
    rr = pr.add_run()
    rr.add_picture(logo_right_path, height=Cm(1.1))

    hp0._element.getparent().remove(hp0._element)

    # ==================== PAGE 1: TITLE, METADATA, AND SECTIONS 1-4 ====================

    # Paragraph 1: Title (16 pt, Bold, Centered, 1.5 line spacing)
    p_title = doc.add_paragraph()
    format_paragraph(p_title, align=WD_ALIGN_PARAGRAPH.CENTER, line_spacing=1.5, space_before=0, space_after=0, keep_with_next=True)
    r_title = p_title.add_run("ECO-CATALYST: B2B/B2G BIOMONITORING AND FMCG EPR CLOSED-LOOP SOCIAL ENTERPRISE FOR ECOTON")
    set_run_font(r_title, size_pt=16, bold=True)

    # Paragraph 2: Team Metadata block (12 pt, Centered, 1.5 line spacing)
    p_meta = doc.add_paragraph()
    format_paragraph(p_meta, align=WD_ALIGN_PARAGRAPH.CENTER, line_spacing=1.5, space_before=0, space_after=2, keep_with_next=True)
    
    r1 = p_meta.add_run("Team Name: ")
    set_run_font(r1, size_pt=12, bold=True)
    r2 = p_meta.add_run("Ayam geprek Pak gembus  |  ")
    set_run_font(r2, size_pt=12, bold=False)
    r3 = p_meta.add_run("University Origin: ")
    set_run_font(r3, size_pt=12, bold=True)
    r4 = p_meta.add_run("Bina Nusantara University\n")
    set_run_font(r4, size_pt=12, bold=False)

    r5 = p_meta.add_run("Member Names: ")
    set_run_font(r5, size_pt=12, bold=True)
    r6 = p_meta.add_run("Kentaro Nareswara Putra Aji (Leader), Nadhira Ilham Ramadhani, Michelle Valerie Huang")
    set_run_font(r6, size_pt=12, bold=False)

    sections = [
        (
            "1. Brief Problem Identification",
            "Founded in 1996 in East Java, Ecoton Foundation is an acclaimed NGO (Kalpataru 2013, Goldman Prize 2011) transitioning into a self-sustaining social enterprise. This pivot faces five bottlenecks: (1) low conversion of awareness into household waste sorting; (2) unproductized B2B/B2G river audits lacking commercial ROI; (3) consumer adoption barriers for Refilin refill stations; (4) unmonetized brand audits lacking an Extended Producer Responsibility (EPR) mechanism; and (5) absence of formal P&L and Social Impact ROI (SROI) accounting."
        ),
        (
            "2. Proposed Solution Overview",
            'We propose "ECO-CATALYST", a three-pillar model: (1) B2B/B2G Eco-Audits & Early Warning: Packaging river biomonitoring into subscription Early Warning Systems for water utilities (PDAM) and paid IPAL/EDC audits for riverside factories; (2) FMCG EPR Closed-Loop Sponsorships: Contracting FMCG brands under Permen LHK No. 75/2019 to fund communal Trash Traps (e.g., Kali Tebu) for plastic credits while cross-subsidizing Refilin bulk refill units across local warungs; and (3) Impact Accounting: Structuring transparent P&L units with audited SROI metrics to attract impact capital.'
        ),
        (
            "3. Relevance to the Competition Theme",
            "ECO-CATALYST directly addresses the Catalyst Summit 2026 theme of transforming environmental advocacy into a resilient social enterprise. By converting pollution monitoring into bankable B2B/B2G contracts, the strategy unites ecological idealism with commercial viability. It mobilizes Quadruple Helix synergy—aligning government, industry, academia, and local communities toward measurable river restoration."
        ),
        (
            "4. Initial Implementation Potential",
            "Execution spans three phases: Phase 1 (Months 1–6, Pilot) incorporates Ecoton's social enterprise entity, pilots PDAM Early Warning contracts in Kali Surabaya, and secures two anchor FMCG Trash Trap sponsorships; Phase 2 (Months 7–18, Scale) expands IPAL/EDC audits to industrial estates and integrates Refilin dispensers into 30 community warungs; and Phase 3 (Months 19–36, Institutionalization) scales municipal partnerships across East Java and secures blended impact investment."
        )
    ]

    for heading_text, body_text in sections:
        p_h = doc.add_paragraph()
        format_paragraph(p_h, align=WD_ALIGN_PARAGRAPH.LEFT, line_spacing=1.5, space_before=0, space_after=0, keep_with_next=True)
        rh = p_h.add_run(heading_text)
        set_run_font(rh, size_pt=14, bold=True)

        p_b = doc.add_paragraph()
        format_paragraph(p_b, align=WD_ALIGN_PARAGRAPH.JUSTIFY, line_spacing=1.5, space_before=0, space_after=0)
        rb = p_b.add_run(body_text)
        set_run_font(rb, size_pt=12, bold=False)

    # ==================== PAGE 2: REFERENCES & APPENDIX ====================
    # Use page_break_before on References heading so no extra blank paragraph is created
    p_ref_h = doc.add_paragraph()
    format_paragraph(p_ref_h, align=WD_ALIGN_PARAGRAPH.LEFT, line_spacing=1.5, space_before=0, space_after=0, keep_with_next=True)
    p_ref_h.paragraph_format.page_break_before = True
    r_ref_h = p_ref_h.add_run("References")
    set_run_font(r_ref_h, size_pt=14, bold=True)

    # References Entries: APA 7th Edition with 1.27 cm (0.5 in) hanging indent, 12 pt, 1.5 line spacing
    references = [
        [
            ("Arisandi, P., & Setyorini, D. (2022). ", False),
            ("Biomonitoring and microplastic contamination in East Java river basins: An ecological assessment", True),
            (". Yayasan Kajian Ekologi dan Konservasi Lahan Basah (Ecoton Foundation).", False)
        ],
        [
            ("Kementerian Lingkungan Hidup dan Kehutanan. (2019). ", False),
            ("Peraturan Menteri Lingkungan Hidup dan Kehutanan Republik Indonesia Nomor P.75/MENLHK/SETJEN/KUM.1/10/2019 tentang Peta Jalan Pengurangan Sampah oleh Produsen", True),
            (". JDIH KLHK.", False)
        ],
        [
            ("180 Degrees Consulting. (2024). ", False),
            ("Social enterprise strategy, financial modeling, and consulting frameworks", True),
            (". Universitas Indonesia Branch Casebook Series.", False)
        ],
        [
            ("Osterwalder, A., & Pigneur, Y. (2010). ", False),
            ("Business model generation: A handbook for visionaries, game changers, and challengers", True),
            (". John Wiley & Sons.", False)
        ],
        [
            ("Porter, M. E., & Kramer, M. R. (2011). Creating shared value: How to reinvent capitalism and unleash a wave of innovation and growth. ", False),
            ("Harvard Business Review", True),
            (", ", False),
            ("89", True),
            ("(1/2), 62–77.", False)
        ]
    ]

    for ref_parts in references:
        p_ref = doc.add_paragraph()
        format_paragraph(p_ref, align=WD_ALIGN_PARAGRAPH.JUSTIFY, line_spacing=1.5, space_before=0, space_after=0)
        p_ref.paragraph_format.left_indent = Cm(1.27)
        p_ref.paragraph_format.first_line_indent = Cm(-1.27)
        for text_chunk, is_italic in ref_parts:
            r = p_ref.add_run(text_chunk)
            set_run_font(r, size_pt=12, bold=False, italic=is_italic)

    # Appendix Heading: 14 pt, Bold
    p_app_h = doc.add_paragraph()
    format_paragraph(p_app_h, align=WD_ALIGN_PARAGRAPH.LEFT, line_spacing=1.5, space_before=4, space_after=0, keep_with_next=True)
    r_app_h = p_app_h.add_run("Appendix: Strategic Framework Summary (SCQA & Business Model Drivers)")
    set_run_font(r_app_h, size_pt=14, bold=True)

    # Brief SCQA Synthesis Line
    p_scqa = doc.add_paragraph()
    format_paragraph(p_scqa, align=WD_ALIGN_PARAGRAPH.JUSTIFY, line_spacing=1.25, space_before=0, space_after=4, keep_with_next=True)
    scqa_parts = [
        ("SCQA Framework — Situation: ", True),
        ("Ecoton holds 30 years of river research & grassroots credibility in East Java. ", False),
        ("Complication: ", True),
        ("Grant dependence and unmonetized advocacy constrain scalable impact. ", False),
        ("Question: ", True),
        ("How can Ecoton monetize scientific and community assets sustainably? ", False),
        ("Answer: ", True),
        ("Deploy the three-pillar ECO-CATALYST model below.", False),
    ]
    for txt, is_b in scqa_parts:
        r = p_scqa.add_run(txt)
        set_run_font(r, size_pt=10.5, bold=is_b)

    # Appendix Comparison Table: As-Is Advocacy vs. To-Be Commercial Social Enterprise
    table_data = [
        ("Strategic Dimension", "As-Is Advocacy Model (NGO)", "To-Be ECO-CATALYST Social Enterprise"),
        ("Core Offering", "Grant-funded river expeditions, public litigation, and ad-hoc pollution exposés.", "Subscription B2B/B2G Early Warning Systems (PDAM) & certified IPAL/EDC compliance audits."),
        ("Target Clients", "Philanthropic donors, international NGOs, and general public awareness.", "PDAM water utilities, industrial estates, riverside manufacturers, and FMCG corporations."),
        ("EPR Integration", "Naming-and-shaming plastic brand audits without downstream monetization.", "Permen LHK No. 75/2019 EPR contracts funding communal Trash Traps & verified plastic credits."),
        ("Refilin Model", "Standalone zero-waste pop-up advocacy facing high unit-cost barriers.", "EPR cross-subsidized bulk refill dispensers embedded in 30+ community warungs."),
        ("Financial Engine", "Unrestricted/restricted donor grants lacking formal unit P&L or SROI tracking.", "Ring-fenced Social Enterprise P&L with audited SROI metrics to unlock blended impact capital.")
    ]

    table = doc.add_table(rows=len(table_data), cols=3)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    col_widths = [Cm(3.1), Cm(5.7), Cm(6.2)]
    border_spec = {"val": "single", "sz": "6", "space": "0", "color": "2C3E50"}

    for row_idx, row_values in enumerate(table_data):
        row = table.rows[row_idx]
        for col_idx, val in enumerate(row_values):
            cell = row.cells[col_idx]
            cell.width = col_widths[col_idx]
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            set_cell_Borders(cell, top=border_spec, left=border_spec, bottom=border_spec, right=border_spec)
            set_cell_margins(cell, top=32, bottom=32, left=70, right=70)
            if row_idx == 0:
                set_cell_shading(cell, "D9E2F3")
            elif row_idx % 2 == 1:
                set_cell_shading(cell, "F9FBFD")

            p = cell.paragraphs[0]
            align = WD_ALIGN_PARAGRAPH.CENTER if row_idx == 0 else WD_ALIGN_PARAGRAPH.LEFT
            format_paragraph(p, align=align, line_spacing=1.12, space_before=0, space_after=0)
            r = p.add_run(val)
            set_run_font(r, size_pt=10, bold=(row_idx == 0 or col_idx == 0))

    primary_docx = os.path.join(WORKSPACE, "Abstrak_CSBCC_Ayam geprek Pak gembus.docx")
    doc.save(primary_docx)

    # Fine-tune native Word character spacing and export PDF via Word COM
    word = win32com.client.Dispatch("Word.Application")
    word.Visible = False
    wdoc = word.Documents.Open(primary_docx)

    # Paragraph 1 (Title): slight character spacing & scaling so it forms 2 clean lines
    wdoc.Paragraphs(1).Range.Font.Spacing = -0.55
    wdoc.Paragraphs(1).Range.Font.Scaling = 95

    # Paragraph 2 (Team & Members metadata): fits neatly on 2 lines (1 line for Team/Uni, 1 line for 3 Members)
    wdoc.Paragraphs(2).Range.Font.Spacing = -0.8
    wdoc.Paragraphs(2).Range.Font.Scaling = 89

    # Body paragraphs on Page 1 (Paragraphs 4, 6, 8, 10): subtle -0.15 pt spacing
    for p_idx in (4, 6, 8, 10):
        wdoc.Paragraphs(p_idx).Range.Font.Spacing = -0.15

    # Appendix heading: fit on 1 line
    for i in range(1, wdoc.Paragraphs.Count + 1):
        txt = wdoc.Paragraphs(i).Range.Text
        if txt.startswith("Appendix: Strategic Framework"):
            wdoc.Paragraphs(i).Range.Font.Spacing = -0.45
            wdoc.Paragraphs(i).Range.Font.Scaling = 94

    wdoc.Repaginate()
    pages = wdoc.ComputeStatistics(2)
    print("Total pages after Word tuning:", pages)

    wdoc.Save()
    wdoc.SaveAs(os.path.join(WORKSPACE, "Abstrak_CSBCC_Ayam_geprek_Pak_gembus.docx"), FileFormat=16)
    wdoc.SaveAs(os.path.join(WORKSPACE, "Abstrak_CSBCC_Ayam geprek Pak gembus.pdf"), FileFormat=17)
    wdoc.SaveAs(os.path.join(WORKSPACE, "Abstrak_CSBCC_Ayam_geprek_Pak_gembus.pdf"), FileFormat=17)
    wdoc.Close(False)
    word.Quit()

if __name__ == "__main__":
    build_docx()
