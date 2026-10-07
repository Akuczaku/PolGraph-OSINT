# OSInt Graph - esplorazione grafica di dati OSINT per casi investigativi
# Copyright (C) 2025-2026 Andrea Cumini <andrea@osintinfo.net>
# SPDX-License-Identifier: GPL-3.0-or-later
"""Raccoglie le licenze di TUTTI i componenti del programma in static/licenses/
(un file di testo per licenza + index.json) e genera THIRD-PARTY-NOTICES.md.

I testi vengono presi dai pacchetti Python installati nel venv, dai file in
static/vendor e dall'interprete Python: cosi' sono quelli veri delle versioni
usate. Da rilanciare quando si aggiorna una dipendenza:

    .venv\\Scripts\\python.exe scripts\\make_licenses.py
"""
import io
import json
import os
import re
import sys
from importlib.metadata import distribution, PackageNotFoundError

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "static", "licenses")
os.makedirs(OUT, exist_ok=True)


def rd(p):
    with io.open(p, encoding="utf-8", errors="replace") as f:
        return f.read()


def wr(name, text):
    with io.open(os.path.join(OUT, name), "w", encoding="utf-8", newline="\n") as f:
        f.write(text.strip("\n") + "\n")
    return name


def pkg_license(name):
    """Testo della licenza dal dist-info del pacchetto installato."""
    try:
        d = distribution(name)
    except PackageNotFoundError:
        sys.exit(f"{name} non installato nel venv: pip install {name}")
    cands = [f for f in (d.files or [])
             if re.search(r"licen[cs]e|copying", str(f), re.I) and "ICON" not in str(f)]
    cands.sort(key=lambda f: (0 if str(f).lower().endswith(("licence.rst", "license.txt", "license")) else 1, len(str(f))))
    if not cands:
        sys.exit(f"{name}: nessun file di licenza nel pacchetto")
    return d.version, rd(str(d.locate_file(cands[0])))


MIT = """MIT License

Copyright (c) {holder}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
"""

entries = []


def add(id_, name, version, license_, holder, url, role_it, role_en, file, group, bundled=True):
    entries.append({"id": id_, "name": name, "version": version, "license": license_,
                    "copyright": holder, "url": url, "role": {"it": role_it, "en": role_en},
                    "file": file, "group": group, "bundled": bundled})


# ----------------------------------------------------------- il programma ---
add("osint-graph", "OSInt Graph", "", "GNU GPL v3 con clausole aggiuntive (attribuzione, nome e logo)",
    "Copyright (C) 2025-2026 Andrea Cumini", "https://www.osintinfo.net",
    "Il programma: licenza e termini aggiuntivi", "The program: license and additional terms",
    wr("NOTICE.txt", rd(os.path.join(ROOT, "NOTICE"))), "program")
add("gpl-3.0", "GNU General Public License", "versione 3", "GPL-3.0",
    "Free Software Foundation", "https://www.gnu.org/licenses/gpl-3.0.html",
    "Testo integrale della licenza del programma", "Full text of the program's license",
    wr("GPL-3.0.txt", rd(os.path.join(ROOT, "LICENSE"))), "program")

# ------------------------------------------------- librerie JavaScript -----
cy_src = rd(os.path.join(ROOT, "static", "vendor", "cytoscape.min.js"))
m = re.match(r"/\*\*(.*?)\*/", cy_src, re.S)
cy_text = re.sub(r"^\s*\* ?", "", m.group(1), flags=re.M).strip() if m else MIT.format(holder="2016-2024, The Cytoscape Consortium")
cy_ver = re.search(r"cytoscape\s+([\d.]+)", rd(os.path.join(ROOT, "templates", "index.html")))
add("cytoscape", "Cytoscape.js", cy_ver.group(1) if cy_ver else "", "MIT",
    "Copyright (c) 2016-2024, The Cytoscape Consortium", "https://js.cytoscape.org",
    "Disegno e interazione del grafo", "Graph rendering and interaction",
    wr("cytoscape.txt", cy_text), "js")
for id_, name, ver in (("cytoscape-fcose", "cytoscape-fcose", "2.2.0"),
                       ("cose-base", "cose-base", "2.2.0"),
                       ("layout-base", "layout-base", "2.0.1")):
    add(id_, name, ver, "MIT", "Copyright (c) i-Vis Research Group, Bilkent University",
        f"https://github.com/iVis-at-Bilkent/{id_}",
        "Disposizione automatica dei nodi (layout organico)", "Automatic node layout (organic layout)",
        wr(f"{id_}.txt", MIT.format(holder="i-Vis Research Group, Bilkent University")), "js")

# ------------------------------------------------------- icone e carattere ---
add("font-awesome", "Font Awesome Free", "6", "Icone CC BY 4.0, codice MIT",
    "Fonticons, Inc.", "https://fontawesome.com",
    "Icone dei tipi di nodo (persona, telefono, email…)", "Node type icons (person, phone, email…)",
    wr("font-awesome.txt", rd(os.path.join(ROOT, "static", "vendor", "fa", "LICENSE.txt"))), "assets")
add("simple-icons", "Simple Icons", "", "CC0 1.0 (pubblico dominio); i loghi restano marchi dei rispettivi titolari",
    "Simple Icons contributors", "https://simpleicons.org",
    "Loghi delle piattaforme social (Facebook, Instagram, Telegram…)", "Social platform logos (Facebook, Instagram, Telegram…)",
    wr("simple-icons.txt", """Simple Icons - https://simpleicons.org

The SVG icons are released under the CC0 1.0 Universal Public Domain
Dedication <https://creativecommons.org/publicdomain/zero/1.0/>: to the
extent possible under law, the authors have waived all copyright and related
rights to the icons.

The brands' names and logos remain the property and trademarks of their
respective owners. OSInt Graph uses them only to identify the platform a
profile belongs to. OSInt Graph is not affiliated with, endorsed by or
sponsored by any of these companies.
"""), "assets")
add("panchang", "Panchang (carattere del logo)", "", "Fontshare Free Font License (solo contorni: il font non è distribuito)",
    "Indian Type Foundry", "https://www.fontshare.com/fonts/panchang",
    "Logo «OSInt Graph» e icona «OG»", "“OSInt Graph” logo and “OG” icon",
    wr("panchang.txt", """Panchang - a typeface by Indian Type Foundry (ITF)
https://www.fontshare.com/fonts/panchang

The logo and the icon of OSInt Graph (static/logo.svg, static/icon.svg and
the same artwork inside the pages) are vector outlines set in Panchang. They
contain outlines only: the font files are NOT distributed with this program.
Panchang is available from Fontshare under the Fontshare Free Font License,
which allows its use in logos and graphics but not the redistribution of the
font files. ITF owns the trademarks and the copyright of the typeface.
"""), "assets")

# --------------------------------------------------------- pacchetti Python --
PY = [
    ("Flask", "Flask", "Server web dell'applicazione", "Application web server"),
    ("Werkzeug", "Werkzeug", "Libreria di base del server web", "Web server toolkit"),
    ("Jinja2", "Jinja2", "Modelli delle pagine", "Page templates"),
    ("itsdangerous", "itsdangerous", "Firma dei dati (dipendenza di Flask)", "Data signing (Flask dependency)"),
    ("click", "click", "Riga di comando (dipendenza di Flask)", "Command line (Flask dependency)"),
    ("MarkupSafe", "MarkupSafe", "Testo sicuro nelle pagine (dipendenza di Jinja2)", "Safe markup (Jinja2 dependency)"),
    ("blinker", "blinker", "Segnali (dipendenza di Flask)", "Signals (Flask dependency)"),
    ("anyascii", "anyascii", "Traslitterazione in caratteri latini", "Transliteration to Latin characters"),
    ("pypdf", "pypdf", "Lettura dei PDF nelle fonti", "Reading PDF sources"),
    ("pdfminer.six", "pdfminer.six", "Estrazione del testo dai PDF", "PDF text extraction"),
    ("python-docx", "python-docx", "Lettura dei documenti Word nelle fonti", "Reading Word documents"),
    ("openpyxl", "openpyxl", "Lettura e importazione di file Excel", "Reading and importing Excel files"),
    ("xlrd", "xlrd", "Lettura dei vecchi file Excel (.xls)", "Reading legacy Excel files (.xls)"),
    ("lxml", "lxml", "Elaborazione XML (dipendenza di python-docx)", "XML processing (python-docx dependency)"),
    ("et_xmlfile", "et_xmlfile", "Scrittura XML (dipendenza di openpyxl)", "XML writing (openpyxl dependency)"),
    ("pillow", "Pillow", "Immagini: miniature e OCR", "Images: thumbnails and OCR"),
    ("pytesseract", "pytesseract", "Collegamento con Tesseract per l'OCR", "Bridge to Tesseract for OCR"),
]
for pkg, shown, rit, ren in PY:
    ver, text = pkg_license(pkg)
    lic = {"Flask": "BSD-3-Clause", "Werkzeug": "BSD-3-Clause", "Jinja2": "BSD-3-Clause",
           "itsdangerous": "BSD-3-Clause", "click": "BSD-3-Clause", "MarkupSafe": "BSD-3-Clause",
           "blinker": "MIT", "anyascii": "ISC", "pypdf": "BSD-3-Clause", "pdfminer.six": "MIT",
           "python-docx": "MIT", "openpyxl": "MIT", "xlrd": "BSD", "lxml": "BSD-3-Clause",
           "et_xmlfile": "MIT", "pillow": "MIT-CMU (HPND)", "pytesseract": "Apache-2.0"}[pkg]
    add(pkg.lower().replace(".", "-"), shown, ver, lic, "", f"https://pypi.org/project/{pkg}/",
        rit, ren, wr(f"{pkg.lower().replace('.', '-')}.txt", text), "python")

py_lic = os.path.join(sys.base_prefix, "LICENSE.txt")
add("python", "Python", ".".join(map(str, sys.version_info[:3])), "PSF License",
    "Python Software Foundation", "https://www.python.org",
    "Interprete incorporato nell'eseguibile", "Interpreter embedded in the executable",
    wr("python.txt", rd(py_lic)) if os.path.exists(py_lic) else "", "python")

# ---------------------------------------------- componenti esterni/strumenti --
_, apache = pkg_license("pytesseract")
add("tesseract", "Tesseract OCR", "5.3.3", "Apache-2.0",
    "Tesseract contributors (Google, Ray Smith e altri)", "https://github.com/tesseract-ocr/tesseract",
    "Riconoscimento del testo nelle immagini. Scaricato a parte in tools/tesseract (non incluso nel programma)",
    "Text recognition in images. Downloaded separately into tools/tesseract (not bundled)",
    wr("apache-2.0.txt", apache), "tools", bundled=False)
add("leptonica", "Leptonica", "1.83", "BSD-2-Clause", "Copyright (C) 2001 Leptonica",
    "http://www.leptonica.org",
    "Libreria di immagini usata da Tesseract (scaricata con Tesseract)", "Image library used by Tesseract (downloaded with it)",
    wr("leptonica.txt", """Leptonica - http://www.leptonica.org

Leptonica is distributed under a BSD 2-clause style license (see the file
leptonica-license.txt in the Tesseract installation). It is not part of
OSInt Graph: it is downloaded together with Tesseract into tools/tesseract.
"""), "tools", bundled=False)
add("pyinstaller", "PyInstaller", "", "GPL-2.0 con eccezione per il bootloader",
    "PyInstaller Development Team", "https://pyinstaller.org",
    "Solo per compilare l'eseguibile: non fa parte del programma distribuito",
    "Build tool only: not part of the distributed program",
    wr("pyinstaller.txt", """PyInstaller - https://pyinstaller.org

PyInstaller is used only to build the Windows executable of OSInt Graph. It
is licensed under the GNU GPL version 2 with a special exception for the
bootloader, which allows the generated executable to be distributed under
the license of the program itself (here: GNU GPL version 3).
"""), "tools", bundled=False)

with io.open(os.path.join(OUT, "index.json"), "w", encoding="utf-8", newline="\n") as f:
    json.dump(entries, f, ensure_ascii=False, indent=1)

# --------------------------------------------------- THIRD-PARTY-NOTICES.md --
lines = ["# Third-party notices", "",
         "OSInt Graph is free software under the GNU GPL version 3 (see LICENSE and NOTICE).",
         "It includes or uses the following third-party components. The full license",
         "texts are in `static/licenses/` and can be read from the program itself",
         "(link «Licenze» in the left panel).", "",
         "| Component | Version | License | Copyright | Used for |", "|---|---|---|---|---|"]
for e in entries:
    if e["group"] == "program":
        continue
    lines.append(f"| [{e['name']}]({e['url']}) | {e['version']} | {e['license']} | {e['copyright']} | "
                 f"{e['role']['en']}{'' if e['bundled'] else ' (not bundled)'} |")
lines += ["", "Brand names and logos of the social platforms are trademarks of their respective",
          "owners; they are used only to identify the platform of a profile. OSInt Graph is not",
          "affiliated with, endorsed by or sponsored by any of them.", ""]
with io.open(os.path.join(ROOT, "THIRD-PARTY-NOTICES.md"), "w", encoding="utf-8", newline="\n") as f:
    f.write("\n".join(lines))
print(f"{len(entries)} componenti -> static/licenses/ e THIRD-PARTY-NOTICES.md")
