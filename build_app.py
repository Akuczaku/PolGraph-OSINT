# -*- coding: utf-8 -*-
# OSInt Graph - esplorazione grafica di dati OSINT per casi investigativi
# Copyright (C) 2025-2026 Andrea Cumini <andrea@osintinfo.net> - www.osintinfo.net
# SPDX-License-Identifier: GPL-3.0-or-later
#
# This program is free software: you can redistribute it and/or modify it
# under the terms of the GNU General Public License as published by the Free
# Software Foundation, either version 3 of the License, or (at your option)
# any later version, with the additional terms in the file NOTICE.
# See the files LICENSE and NOTICE for details. Distributed WITHOUT ANY WARRANTY.

"""Compila app.py (il server di OSInt Graph) in un unico eseguibile onefile
con PyInstaller e prepara in dist/ la cartella pronta da distribuire.

Avvialo con lo STESSO interprete del progetto (il venv), perché usa le librerie
installate lì:

    Windows:   .venv\\Scripts\\python.exe -m pip install -r requirements.txt -r requirements-build.txt
               .venv\\Scripts\\python.exe build_app.py
    Linux:     .venv/bin/python build_app.py

Cosa fa:
  * incorpora nell'eseguibile le risorse dell'app: templates/ e static/
    (pagina, script, stili, logo, icone e i testi delle licenze);
  * usa static/icon.ico come icona dell'eseguibile (Windows);
  * controlla che le librerie necessarie siano installate (requirements.txt)
    e include i motori di traslitterazione PyICU e anyascii se presenti;
  * NON incorpora i dati: la cartella data/ (casi), chatbot.conf e la
    cartella tools/tesseract restano ESTERNI, accanto all'eseguibile. Al
    primo avvio il programma crea data/ e chiede di creare un caso;
  * copia accanto all'eseguibile i file che vanno distribuiti con lui:
    LICENSE, NOTICE, THIRD-PARTY-NOTICES.md e chatbot.conf.example.

Opzioni:
  --name NOME   nome dell'eseguibile (default: OSIntGraph)
  --noconsole   nasconde la finestra console (solo browser). Di default la
                console resta visibile: mostra l'indirizzo, i log ed è il modo
                per fermare il server (Ctrl+C o chiudendo la finestra).
  --keep        non cancella build/ e il file .spec al termine

Risultato:  dist/OSIntGraph.exe  (Windows)   /   dist/OSIntGraph  (Linux)
            + LICENSE, NOTICE, THIRD-PARTY-NOTICES.md, chatbot.conf.example

Uso dell'eseguibile:
  fai doppio clic (o lancialo da terminale): parte il server e si apre il
  browser su http://127.0.0.1:5000. I dati vengono salvati in data/ accanto
  all'eseguibile. Tesseract (OCR) si scarica dall'app, sezione «Fonti».

AI (facoltativa):
  il chatbot si configura dall'app (pannello «Intelligenza artificiale») e
  la configurazione sta in chatbot.conf, accanto all'eseguibile (vedi
  chatbot.conf.example). Con l'interruttore «AI attiva» spento l'app non si
  collega a niente e usa soltanto la traslitterazione locale.
"""
import importlib
import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "app.py")
SEP = os.pathsep                      # ';' su Windows, ':' su Linux/Mac
ICON = os.path.join(ROOT, "static", "icon.ico")

# file da distribuire ACCANTO all'eseguibile
DIST_FILES = ["LICENSE", "NOTICE", "THIRD-PARTY-NOTICES.md", "chatbot.conf.example"]

# librerie necessarie (requirements.txt): modulo da importare -> pacchetto pip
REQUIRED = {
    "flask": "Flask", "anyascii": "anyascii", "pdfminer": "pdfminer.six",
    "pypdf": "pypdf", "docx": "python-docx", "openpyxl": "openpyxl", "xlrd": "xlrd",
    "PIL": "Pillow", "pytesseract": "pytesseract",
}
# importati in modo lazy da app.py / sources.py: PyInstaller non li vede da solo
HIDDEN = ["docx", "openpyxl", "xlrd", "pypdf", "pytesseract", "PIL.Image",
          "pdfminer.high_level", "setup_tesseract", "tkinter", "tkinter.filedialog"]


def check_requirements():
    missing = []
    for mod, pkg in REQUIRED.items():
        try:
            importlib.import_module(mod)
        except Exception:
            missing.append(pkg)
    if missing:
        sys.exit("Mancano librerie necessarie: " + ", ".join(missing) + "\n"
                 f'Installale con:\n    "{sys.executable}" -m pip install -r requirements.txt')
    try:
        import PyInstaller  # noqa: F401
    except ImportError:
        sys.exit("PyInstaller non installato in questo interprete.\n"
                 f'Installalo con:\n    "{sys.executable}" -m pip install -r requirements-build.txt')
    for name in DIST_FILES:
        if not os.path.isfile(os.path.join(ROOT, name)):
            sys.exit(f"Manca il file {name}: va distribuito insieme all'eseguibile.")


def main():
    argv = sys.argv[1:]
    noconsole = "--noconsole" in argv
    keep = "--keep" in argv
    name = "OSIntGraph"
    if "--name" in argv:
        i = argv.index("--name")
        if i + 1 < len(argv):
            name = argv[i + 1]

    check_requirements()

    args = [
        sys.executable, "-m", "PyInstaller",
        "--onefile",
        "--name", name,
        "--noconfirm",
        "--clean",
        # risorse dell'app dentro l'eseguibile (percorsi relativi: si gira da ROOT)
        "--add-data", f"templates{SEP}templates",
        "--add-data", f"static{SEP}static",
        # la console mostra i log ed è il modo per fermare il server;
        # --noconsole la nasconde (l'opzione conta solo su Windows)
        ("--windowed" if noconsole else "--console"),
    ]
    if os.path.isfile(ICON):
        args += ["--icon", ICON]
    else:
        print("(nota: static/icon.ico non trovato, l'eseguibile avrà l'icona predefinita)")

    # motori di traslitterazione, inclusi solo se installati
    for pkg in ("icu", "anyascii"):
        try:
            importlib.import_module(pkg)
            args += ["--collect-all", pkg]
        except Exception:
            print(f"(nota: {pkg} non installato, lo salto)")

    for mod in HIDDEN:
        args += ["--hidden-import", mod]

    args.append(SRC)

    print(">> " + " ".join(f'"{a}"' if " " in a else a for a in args))
    r = subprocess.run(args, cwd=ROOT)
    if r.returncode != 0:
        sys.exit(f"PyInstaller ha restituito errore {r.returncode}")

    exe = name + (".exe" if os.name == "nt" else "")
    dist = os.path.join(ROOT, "dist")
    out = os.path.join(dist, exe)
    if not os.path.isfile(out):
        sys.exit("Compilazione finita ma non trovo l'eseguibile in dist/")

    # file legali e configurazione d'esempio accanto all'eseguibile
    for fn in DIST_FILES:
        shutil.copy2(os.path.join(ROOT, fn), os.path.join(dist, fn))

    size_mb = os.path.getsize(out) / (1024 * 1024)
    print(f"\nOK  ->  {out}   ({size_mb:.1f} MB)")
    print("In dist/ ci sono anche: " + ", ".join(DIST_FILES))
    print("Da distribuire insieme. Al primo avvio il programma crea data/ e chiede un caso.")

    if not keep:
        shutil.rmtree(os.path.join(ROOT, "build"), ignore_errors=True)
        spec = os.path.join(ROOT, name + ".spec")
        if os.path.isfile(spec):
            os.remove(spec)
        print("Puliti build/ e il file .spec (usa --keep per conservarli).")


if __name__ == "__main__":
    main()
