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

"""Scarica Tesseract OCR in una cartella LOCALE del progetto (tools/tesseract),
senza installarlo nel sistema. Serve all'OCR delle immagini nelle fonti.

    Windows:  scarica l'installer ufficiale UB-Mannheim e lo estrae in locale
              (installazione silenziosa nella sola cartella tools/tesseract).
    Linux/Mac: Tesseract si installa dal gestore pacchetti; lo script te lo dice.

Uso:
    .venv\\Scripts\\python.exe setup_tesseract.py            (Windows)
    python setup_tesseract.py --url <URL_installer.exe>      (versione diversa)

Dopo il download l'app trova Tesseract da sola (cerca in tools/tesseract) e
attiva l'OCR: nella sezione Fonti comparirà "OCR attivo".

Lo stesso download si puo' avviare dall'interfaccia (pulsante «Scarica
Tesseract» nella sezione Fonti): app.py usa setup_windows() di questo modulo.
"""
import os
import io
import sys
import shutil
import tempfile
import subprocess
import urllib.request

ROOT = os.path.dirname(os.path.abspath(__file__))
DEST = os.path.join(ROOT, "tools", "tesseract")

# Installer ufficiale UB-Mannheim (build Windows 64 bit). Puoi indicarne un
# altro con --url se preferisci una versione diversa.
DEFAULT_URL = os.environ.get("TESSERACT_URL") or (
    "https://digi.bib.uni-mannheim.de/tesseract/"
    "tesseract-ocr-w64-setup-5.3.3.20231005.exe")


def _arg(name, default=None):
    if name in sys.argv:
        i = sys.argv.index(name)
        if i + 1 < len(sys.argv):
            return sys.argv[i + 1]
    return default


def download(url, dst, progress=None):
    """Scarica 'url' in 'dst'. 'progress(fatti, totale)' se dato, altrimenti
    stampa l'avanzamento sul terminale."""
    if progress is None:
        print(f"Scarico:\n  {url}")
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"})
    with urllib.request.urlopen(req, timeout=60) as r, io.open(dst, "wb") as f:
        total = int(r.headers.get("Content-Length") or 0)
        done = 0
        while True:
            chunk = r.read(262144)
            if not chunk:
                break
            f.write(chunk)
            done += len(chunk)
            if progress is not None:
                progress(done, total)
            elif total:
                print(f"\r  {done // (1024*1024)} / {total // (1024*1024)} MB "
                      f"({done * 100 // total}%)", end="", flush=True)
    if progress is None:
        print()


def _find_7zip():
    for p in (r"C:\Program Files\7-Zip\7z.exe",
              r"C:\Program Files (x86)\7-Zip\7z.exe"):
        if os.path.isfile(p):
            return p
    return shutil.which("7z") or shutil.which("7za")


def setup_windows(url, dest=DEST, progress=None, stage=None):
    """Scarica ed estrae Tesseract in 'dest'. Ritorna il percorso di
    tesseract.exe; solleva RuntimeError se alla fine non c'e'.
    'progress(fatti, totale)' e 'stage(nome)' ("download", "extract", "verify")
    servono all'interfaccia; senza, si stampa sul terminale."""
    quiet = progress is not None or stage is not None
    say = (lambda *a, **k: None) if quiet else print
    tell = stage or (lambda name: None)
    os.makedirs(dest, exist_ok=True)
    tmp = os.path.join(tempfile.gettempdir(), "tesseract-setup.exe")
    tell("download")
    download(url, tmp, progress)
    size = os.path.getsize(tmp) / (1024 * 1024)
    say(f"Scaricato {size:.0f} MB.")
    exe = os.path.join(dest, "tesseract.exe")

    tell("extract")
    sevenzip = _find_7zip()
    if sevenzip:
        # ESTRAZIONE (senza privilegi admin): l'installer NSIS è un archivio,
        # 7-Zip ne estrae i file direttamente nella cartella locale.
        say(f"Estraggo con 7-Zip in:\n  {dest}")
        subprocess.run([sevenzip, "x", tmp, f"-o{dest}", "-y"],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        # niente 7-Zip: si prova l'installer silenzioso (può chiedere l'admin)
        say("7-Zip non trovato: uso l'installer silenzioso "
            "(potrebbe chiedere privilegi di amministratore)…")
        subprocess.run([tmp, "/S", f"/D={dest}"])

    try:
        os.remove(tmp)
    except OSError:
        pass

    tell("verify")
    if not os.path.isfile(exe):
        raise RuntimeError(f"Non trovo tesseract.exe in {dest}. "
                           "Installa 7-Zip (per l'estrazione senza admin) e riprova, "
                           "oppure esegui l'installer manualmente.")
    ver = subprocess.run([exe, "--version"], capture_output=True, text=True)
    line = (ver.stdout or ver.stderr).splitlines()
    say("\nOK  ->  " + exe)
    if line:
        say(line[0])
    say("\nAvvia (o riavvia) il programma: l'OCR sarà attivo.")
    return exe


def setup_unix():
    print("Su Linux/Mac installa Tesseract dal gestore pacchetti:\n")
    print("  Debian/Ubuntu:  sudo apt-get install tesseract-ocr tesseract-ocr-ita")
    print("  Fedora:         sudo dnf install tesseract")
    print("  macOS (brew):   brew install tesseract\n")
    print("In alternativa metti un binario 'tesseract' in:")
    print(f"  {DEST}")
    print("e l'app lo userà da lì.")


def main():
    if shutil.which("tesseract"):
        print("Nota: Tesseract è già nel PATH di sistema; l'OCR funziona già.")
    url = _arg("--url", DEFAULT_URL)
    if os.name == "nt":
        try:
            setup_windows(url)
        except RuntimeError as e:
            sys.exit(str(e))
    else:
        setup_unix()


if __name__ == "__main__":
    main()
