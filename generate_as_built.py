import sys
import json
import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

def create_exact_as_built_report(output_path, site_data, photos_dict, attestation_path, logo_path=None):
    """
    Génère une présentation PowerPoint AS_BUILT Ooredoo exactement conforme au template :
    - 9 slides strictes au format 16:9
    - Charte graphique Ooredoo (Bannières rouge #EB212E, Typographie Arial, Logo)
    - Slide 1: Tableau des données administratives (Nom site, Code site, Sous-traitant, Date)
    - Slides 2 à 8: 7 Conteneurs photos terrain avec bordure fine
    - Slide 9: Attestation de scellement
    """
    prs = Presentation()
    prs.slide_width = Inches(10)
    prs.slide_height = Inches(5.625) # Format 16:9
    blank_layout = prs.slide_layouts[6] # Layout vide

    # Couleurs de la charte Ooredoo
    RED_OOREDOO = RGBColor(235, 33, 46) # #EB212E
    BLACK = RGBColor(0, 0, 0)
    WHITE = RGBColor(255, 255, 255)
    GRAY_TEXT = RGBColor(80, 80, 80)
    BORDER_COLOR = RGBColor(30, 41, 59)

    # Titres des 9 slides
    slide_titles = [
        "AS_BUILT Travaux GC", # Slide 1
        "2 Photos général de site",
        "3 Photos général de mât",
        "4 Fixation Mat",
        "5 Acheminement de fourreau Outdoor",
        "6 Acheminement mollure indoor",
        "7 Installation Rack B2BNA",
        "8 Installation SUPPORT site Vis-à-vis",
        "SIL_94939 Merci" # Slide 9
    ]

    for idx, title_text in enumerate(slide_titles):
        slide = prs.slides.add_slide(blank_layout)

        # 1. En-tête / Banner Rouge Supérieure
        banner = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(10), Inches(0.9))
        banner.fill.solid()
        banner.fill.fore_color.rgb = RED_OOREDOO
        banner.line.color.rgb = RED_OOREDOO

        # Texte du Titre dans la bannière
        tx_box = slide.shapes.add_textbox(Inches(0.5), Inches(0.15), Inches(7), Inches(0.6))
        tf = tx_box.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = title_text
        p.font.bold = True
        p.font.size = Pt(22)
        p.font.color.rgb = WHITE
        p.font.name = "Arial"

        # Sous-titre pour Slide 1
        if idx == 0:
            sub_box = slide.shapes.add_textbox(Inches(0.5), Inches(0.55), Inches(7), Inches(0.3))
            p_sub = sub_box.text_frame.paragraphs[0]
            p_sub.text = "Travaux GC site client Ooredoo"
            p_sub.font.size = Pt(12)
            p_sub.font.color.rgb = WHITE
            p_sub.font.name = "Arial"

        # Logo Ooredoo (Haut Droite) si fourni
        if logo_path and os.path.exists(logo_path):
            try:
                slide.shapes.add_picture(logo_path, Inches(8.0), Inches(0.1), width=Inches(1.8))
            except Exception as e:
                print(f"Warning: could not add logo: {e}", file=sys.stderr)

        # -------------------------------------------------------------
        # SLIDE 1 : Tableau des données Administratives
        # -------------------------------------------------------------
        if idx == 0:
            table_shape = slide.shapes.add_table(4, 2, Inches(1.5), Inches(1.5), Inches(7.0), Inches(2.8))
            table = table_shape.table
            
            # Ajustement largeurs colonnes
            table.columns[0].width = Inches(2.8)
            table.columns[1].width = Inches(4.2)
            
            labels = ["Nom site client :", "Code Site Client :", "Sous-traitant :", "Date :"]
            keys = ["nom_site", "code_site", "sous_traitant", "date"]

            for i in range(4):
                # Colonne Gauche (Libellés)
                cell_lbl = table.cell(i, 0)
                cell_lbl.text = labels[i]
                cell_lbl.fill.solid()
                cell_lbl.fill.fore_color.rgb = RGBColor(240, 240, 240)
                p = cell_lbl.text_frame.paragraphs[0]
                p.font.bold = True
                p.font.size = Pt(14)
                p.font.color.rgb = BLACK
                p.font.name = "Arial"

                # Colonne Droite (Valeurs)
                cell_val = table.cell(i, 1)
                cell_val.text = str(site_data.get(keys[i], 'Non renseigné'))
                cell_val.fill.solid()
                cell_val.fill.fore_color.rgb = RGBColor(255, 255, 255)
                p_val = cell_val.text_frame.paragraphs[0]
                p_val.font.size = Pt(14)
                p_val.font.color.rgb = BLACK
                p_val.font.name = "Arial"

        # -------------------------------------------------------------
        # SLIDES 2 à 8 : Images des travaux Terrain (Rôle Chef d'équipe)
        # -------------------------------------------------------------
        elif 1 <= idx <= 7:
            slide_key = idx + 1 # Clés 2 à 8
            img_file = photos_dict.get(slide_key) or photos_dict.get(str(slide_key))
            
            # Cadre conteneur avec bordure noire fine
            if img_file and os.path.exists(str(img_file)):
                try:
                    pic = slide.shapes.add_picture(str(img_file), Inches(1.0), Inches(1.2), width=Inches(8.0), height=Inches(4.0))
                    # Bordure noire fine
                    pic.line.color.rgb = BLACK
                    pic.line.width = Pt(1)
                except Exception as e:
                    print(f"Error adding picture for slide {idx + 1}: {e}", file=sys.stderr)
                    img_file = None

            if not img_file or not os.path.exists(str(img_file)):
                # Cadre réservé vide avec texte indicatif et bordure fine
                rect = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.0), Inches(1.2), Inches(8.0), Inches(4.0))
                rect.fill.solid()
                rect.fill.fore_color.rgb = RGBColor(245, 245, 245)
                rect.line.color.rgb = BLACK
                rect.line.width = Pt(1)
                tf = rect.text_frame
                p = tf.paragraphs[0]
                p.text = f"[ PHOTO DE TERRAIN - SLIDE {idx + 1} : {title_text} ]"
                p.alignment = PP_ALIGN.CENTER
                p.font.color.rgb = GRAY_TEXT
                p.font.size = Pt(16)
                p.font.name = "Arial"

        # -------------------------------------------------------------
        # SLIDE 9 : Attestation de Scellement / Merci (Rôle Admin)
        # -------------------------------------------------------------
        elif idx == 8:
            if attestation_path and os.path.exists(str(attestation_path)):
                try:
                    pic = slide.shapes.add_picture(str(attestation_path), Inches(1.0), Inches(1.2), width=Inches(8.0), height=Inches(4.0))
                    pic.line.color.rgb = BLACK
                    pic.line.width = Pt(1)
                except Exception as e:
                    print(f"Error adding attestation: {e}", file=sys.stderr)
                    attestation_path = None

            if not attestation_path or not os.path.exists(str(attestation_path)):
                rect = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.0), Inches(1.2), Inches(8.0), Inches(4.0))
                rect.fill.solid()
                rect.fill.fore_color.rgb = RGBColor(245, 245, 245)
                rect.line.color.rgb = BLACK
                rect.line.width = Pt(1)
                tf = rect.text_frame
                p = tf.paragraphs[0]
                p.text = "[ ATTESTATION DE SCELLEMENT ]"
                p.alignment = PP_ALIGN.CENTER
                p.font.color.rgb = GRAY_TEXT
                p.font.size = Pt(16)
                p.font.name = "Arial"

    prs.save(output_path)
    print(f"Presentation saved successfully to: {output_path}")

if __name__ == "__main__":
    # Support command line invocation with JSON payload
    if len(sys.argv) > 1:
        config_arg = sys.argv[1]
        try:
            if os.path.exists(config_arg):
                with open(config_arg, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            else:
                data = json.loads(config_arg)
            
            output_file = data.get('output_path', 'Rapport_AS_BUILT.pptx')
            site_data = data.get('site_data', {})
            photos_dict = data.get('photos_dict', {})
            attestation_path = data.get('attestation_path')
            logo_path = data.get('logo_path')
            
            create_exact_as_built_report(
                output_path=output_file,
                site_data=site_data,
                photos_dict=photos_dict,
                attestation_path=attestation_path,
                logo_path=logo_path
            )
        except Exception as err:
            print(f"Error processing JSON: {err}", file=sys.stderr)
            sys.exit(1)
    else:
        # Default dry test
        demo_site = {
            "nom_site": "SIL_8321",
            "code_site": "SIL_8321",
            "sous_traitant": "SMTT Telecom",
            "date": "2026-09-10"
        }
        create_exact_as_built_report("Rapport_AS_BUILT_SIL_8321_Demo.pptx", demo_site, {}, None)
