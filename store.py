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

"""Archivio SQLite dell'applicazione, organizzato per CASI (fascicoli).

    data/osintgraph.db        archivio GLOBALE, comune a tutti i casi:
        cases                 elenco dei casi
        translit              dizionario di traslitterazione
        blobs                 indice dei documenti (fonti)
        meta                  caso corrente, versione del dizionario
    data/cases/<id>.db        un database per ogni caso:
        imports               JSON importati da app terze, agganciati a un nodo
        ann_*                 annotazioni: nodi aggiunti a mano (e schede),
                              collegamenti, note, etichette, valori modificati,
                              stili, nodi nascosti
        views                 viste salvate del grafo
        meta                  versione dei dati (invalida la cache del grafo)

Le annotazioni si leggono come un unico dizionario (load_annotations) e si
salvano per DIFFERENZA rispetto a quanto letto (save_annotations): si scrivono
solo le righe cambiate, in una transazione. Cosi' due richieste ravvicinate
che toccano cose diverse non si sovrascrivono a vicenda.
"""
import os
import json
import time
import sqlite3
import logging
import threading

import re
import uuid

DB_NAME = "osintgraph.db"
CASES_DIR = "cases"
_data_dir = None
_g_path = None                  # archivio globale
_db_path = None                 # database del caso corrente
_case_id = None
_local = threading.local()
_write_lock = threading.RLock()

SCHEMA = """
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS imports (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    anchor       TEXT NOT NULL,          -- id del nodo (target) a cui si aggancia
    anchor_label TEXT NOT NULL,
    anchor_ntype TEXT NOT NULL DEFAULT 'generic',
    anchor_platform TEXT NOT NULL DEFAULT 'generic',
    filename     TEXT NOT NULL,
    content      TEXT NOT NULL,
    size         INTEGER NOT NULL,
    records      INTEGER NOT NULL,
    dossier      INTEGER NOT NULL DEFAULT 0,   -- scheda anagrafica del target
    imported_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS imports_anchor ON imports(anchor);
CREATE TABLE IF NOT EXISTS ann_added      (id TEXT PRIMARY KEY, seq INTEGER NOT NULL, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ann_links      (id TEXT PRIMARY KEY, seq INTEGER NOT NULL, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ann_deleted    (id TEXT PRIMARY KEY, seq INTEGER NOT NULL, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ann_notes      (id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ann_labels     (id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ann_edits      (id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ann_edge_styles(id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ann_targets    (id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS views (
    id    TEXT PRIMARY KEY,
    name  TEXT NOT NULL,
    at    TEXT NOT NULL,
    count INTEGER NOT NULL,
    data  TEXT NOT NULL
);
"""

SCHEMA_GLOBAL = """
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS cases (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS blobs (
    key   TEXT PRIMARY KEY,
    data  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS translit (
    word       TEXT PRIMARY KEY,
    value      TEXT NOT NULL DEFAULT '',
    source     TEXT NOT NULL CHECK (source IN ('manual', 'ai', 'pending')),
    script     TEXT NOT NULL DEFAULT '',
    model      TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
);
"""

# collezioni delle annotazioni: nome -> (tabella, e' una lista ordinata?)
_ANN_LISTS = {"added": "ann_added", "links": "ann_links", "deleted": "ann_deleted"}
_ANN_MAPS = {"notes": "ann_notes", "labels": "ann_labels", "edits": "ann_edits",
             "edge_styles": "ann_edge_styles", "targets": "ann_targets"}


def _now():
    return time.strftime("%Y-%m-%d %H:%M:%S")


class NoCaseError(RuntimeError):
    """Nessun caso aperto: tutto cio' che vive nel database del caso (nodi,
    collegamenti, note, viste, JSON importati) non e' disponibile."""


def init(data_dir):
    """Apre l'archivio globale e il caso corrente. Se non esiste alcun caso
    NON ne viene creato uno: l'utente deve crearne uno dall'interfaccia (al
    primo avvio il programma parte senza casi)."""
    global _data_dir, _g_path
    _data_dir = data_dir
    os.makedirs(os.path.join(data_dir, CASES_DIR), exist_ok=True)
    _g_path = os.path.join(data_dir, DB_NAME)
    _migrate_single_db()
    with _write_lock:
        gconn().executescript(SCHEMA_GLOBAL)
    cid = get_gmeta("current_case")
    if not cid or not case_exists(cid):
        rows = list_cases()
        cid = rows[0]["id"] if rows else None
    if cid:
        open_case(cid)
    else:
        _close_case()
    return _g_path


def _close_case():
    """Nessun caso corrente (archivio appena creato o ultimo caso eliminato)."""
    global _db_path, _case_id
    with _write_lock:
        _db_path, _case_id = None, None
    set_gmeta("current_case", "")


def _migrate_single_db():
    """Prima dei casi c'era un solo database (data/osintgraph.db) con tutto:
    diventa il primo caso, e dizionario e indice passano all'archivio globale."""
    if not os.path.exists(_g_path):
        return
    c = sqlite3.connect(_g_path)
    try:
        tabs = {r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    finally:
        c.close()
    if "cases" in tabs or "ann_added" not in tabs:
        return
    # Si COPIANO le tabelle nel database del nuovo caso invece di spostare il
    # file: su Windows un file aperto da un altro processo (il ricaricatore di
    # Flask, un secondo avvio) non si puo' spostare.
    cid = _new_case_id()
    dest = _case_file(cid)
    d = sqlite3.connect(dest)
    try:
        d.executescript(SCHEMA)
        d.execute("ATTACH DATABASE ? AS old", (_g_path,))
        for t in _CASE_TABLES:
            if t in tabs:
                cols = [r[1] for r in d.execute(f"PRAGMA old.table_info({t})")]
                mine = {r[1] for r in d.execute(f"PRAGMA main.table_info({t})")}
                cols = ", ".join(c for c in cols if c in mine)
                d.execute(f"INSERT OR IGNORE INTO main.{t}({cols}) SELECT {cols} FROM old.{t}")
        d.commit()
        d.execute("DETACH DATABASE old")
    finally:
        d.close()
    g = sqlite3.connect(_g_path)
    try:
        g.executescript(SCHEMA_GLOBAL)
        g.execute("INSERT INTO cases(id, name, description, created_at, updated_at) "
                  "VALUES(?, 'Caso 1', '', ?, ?)", (cid, _now(), _now()))
        g.execute("INSERT OR REPLACE INTO meta(key, value) VALUES('current_case', ?)", (cid,))
        g.execute("DELETE FROM meta WHERE key = 'data_version'")
        for t in _CASE_TABLES:
            if t != "meta":
                g.execute(f"DROP TABLE IF EXISTS {t}")     # ora stanno nel caso
        g.commit()
    finally:
        g.close()
    logging.info(f"Archivio convertito: i dati esistenti sono ora il caso {cid}")


# tabelle che appartengono a un caso (nel vecchio database unico c'erano tutte)
_CASE_TABLES = ("meta", "imports", "ann_added", "ann_links", "ann_deleted", "ann_notes",
                "ann_labels", "ann_edits", "ann_edge_styles", "ann_targets", "views")


def _new_case_id():
    return "c" + time.strftime("%Y%m%d%H%M%S") + uuid.uuid4().hex[:4]


def _case_file(cid):
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", str(cid or "")):
        raise ValueError("id del caso non valido")
    return os.path.join(_data_dir, CASES_DIR, f"{cid}.db")


def path():
    return _db_path


def current_case():
    return _case_id


def _connect(p):
    c = sqlite3.connect(p, timeout=30, isolation_level=None, check_same_thread=False)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA foreign_keys = ON")
    c.execute("PRAGMA journal_mode = WAL")
    c.execute("PRAGMA synchronous = NORMAL")
    return c


def conn():
    """Connessione al database del CASO corrente, una per thread (Flask serve
    le richieste su piu' thread). Cambiando caso si riapre da sola."""
    if _db_path is None:
        raise NoCaseError("nessun caso aperto: crea un caso o scegline uno esistente")
    c = getattr(_local, "conn", None)
    if c is None or getattr(_local, "path", None) != _db_path:
        if c is not None:
            try:
                c.close()
            except Exception:
                pass
        c = _connect(_db_path)
        _local.conn, _local.path = c, _db_path
    return c


def gconn():
    """Connessione all'archivio GLOBALE (casi, dizionario, indice fonti)."""
    c = getattr(_local, "gconn", None)
    if c is None:
        c = _connect(_g_path)
        _local.gconn = c
    return c


class _tx:
    """Transazione in scrittura (una alla volta nel processo)."""
    def __init__(self, glob=False):
        self.glob = glob

    def __enter__(self):
        _write_lock.acquire()
        try:
            self.c = gconn() if self.glob else conn()
            self.c.execute("BEGIN IMMEDIATE")
        except Exception:
            _write_lock.release()
            raise
        return self.c

    def __exit__(self, et, ev, tb):
        try:
            self.c.execute("ROLLBACK" if et else "COMMIT")
        finally:
            _write_lock.release()
        return False


def tx(glob=False):
    return _tx(glob)


# ---------------------------------------------------------------------- casi ---
def list_cases():
    rows = gconn().execute("SELECT * FROM cases ORDER BY name COLLATE NOCASE").fetchall()
    out = []
    for r in rows:
        d = dict(r)
        d["current"] = d["id"] == _case_id
        try:
            d["size"] = os.path.getsize(_case_file(d["id"]))
        except OSError:
            d["size"] = 0
        out.append(d)
    return out


def case_exists(cid):
    return gconn().execute("SELECT 1 FROM cases WHERE id = ?", (cid,)).fetchone() is not None \
        and os.path.exists(_case_file(cid))


def get_case(cid):
    r = gconn().execute("SELECT * FROM cases WHERE id = ?", (cid,)).fetchone()
    return dict(r) if r else None


def create_case(name, description=""):
    cid = _new_case_id()
    c = _connect(_case_file(cid))
    try:
        c.executescript(SCHEMA)
    finally:
        c.close()
    with tx(True) as g:
        g.execute("INSERT INTO cases(id, name, description, created_at, updated_at) "
                  "VALUES(?, ?, ?, ?, ?)", (cid, name, description, _now(), _now()))
    return get_case(cid)


def update_case(cid, name=None, description=None):
    with tx(True) as g:
        if name is not None:
            g.execute("UPDATE cases SET name = ?, updated_at = ? WHERE id = ?", (name, _now(), cid))
        if description is not None:
            g.execute("UPDATE cases SET description = ?, updated_at = ? WHERE id = ?",
                      (description, _now(), cid))
    return get_case(cid)


def open_case(cid):
    """Rende corrente il caso: da qui in poi tutte le letture e scritture
    (annotazioni, viste, JSON importati) vanno nel suo database."""
    global _db_path, _case_id
    p = _case_file(cid)
    c = _connect(p)
    try:
        c.executescript(SCHEMA)          # crea o aggiorna le tabelle del caso
    finally:
        c.close()
    with _write_lock:
        _db_path, _case_id = p, cid
    set_gmeta("current_case", cid)
    return get_case(cid)


def delete_case(cid):
    """Elimina il caso e il suo database (le immagini in data/media restano)."""
    p = _case_file(cid)
    with tx(True) as g:
        g.execute("DELETE FROM cases WHERE id = ?", (cid,))
    if getattr(_local, "path", None) == p and getattr(_local, "conn", None) is not None:
        _local.conn.close()
        _local.conn = None
    if cid == _case_id:
        _close_case()                    # era il caso aperto: ora non ce n'e' nessuno
    for ext in ("", "-wal", "-shm"):
        try:
            os.remove(p + ext)
        except OSError:
            pass


def merge_cases(ids, name, description=""):
    """Nuovo caso con il contenuto di tutti i casi indicati. Gli elementi con lo
    stesso id (stessa persona, stesso telefono...) diventano UN nodo: se i dati
    sono diversi, la voce del secondo caso diventa una scheda in piu'."""
    new = create_case(name, description)
    dest = _connect(_case_file(new["id"]))
    try:
        for cid in ids:
            src = _case_file(cid)
            if not os.path.exists(src):
                continue
            _merge_into(dest, src)
    finally:
        dest.close()
    return new


def _merge_into(dest, src):
    s = _connect(src)
    try:
        dest.execute("BEGIN IMMEDIATE")
        # liste (nodi aggiunti, collegamenti, nodi nascosti)
        for table in ("ann_added", "ann_links", "ann_deleted"):
            base = dest.execute(f"SELECT COALESCE(MAX(seq), 0) FROM {table}").fetchone()[0]
            for r in s.execute(f"SELECT id, data FROM {table} ORDER BY seq"):
                old = dest.execute(f"SELECT data FROM {table} WHERE id = ?", (r["id"],)).fetchone()
                if old is not None:
                    if old["data"] == r["data"] or table == "ann_deleted":
                        continue
                    # stesso id, dati diversi: scheda in piu' (nodi) o nuovo collegamento
                    nid = f"{r['id'].split('~')[0]}~{uuid.uuid4().hex[:6]}"
                    d = json.loads(r["data"])
                    d["id"] = nid
                    if table == "ann_links" and "edge_id" in d:
                        d["edge_id"] = nid
                    if table == "ann_added" and d.get("edge_id"):
                        d["edge_id"] = f"{d['edge_id']}_{uuid.uuid4().hex[:4]}"
                    data, rid = _dumps(d), nid
                else:
                    data, rid = r["data"], r["id"]
                base += 1
                dest.execute(f"INSERT INTO {table}(id, seq, data) VALUES(?, ?, ?)", (rid, base, data))
        # note: se ci sono in entrambi i casi si tengono tutte e due
        for r in s.execute("SELECT id, data FROM ann_notes"):
            old = dest.execute("SELECT data FROM ann_notes WHERE id = ?", (r["id"],)).fetchone()
            if old is None:
                dest.execute("INSERT INTO ann_notes(id, data) VALUES(?, ?)", (r["id"], r["data"]))
            elif old["data"] != r["data"]:
                a, b = json.loads(old["data"]), json.loads(r["data"])
                dest.execute("UPDATE ann_notes SET data = ? WHERE id = ?",
                             (_dumps(f"{a}\n---\n{b}"), r["id"]))
        # etichette, valori modificati, stili: vince il primo caso
        for table in ("ann_labels", "ann_edits", "ann_edge_styles"):
            for r in s.execute(f"SELECT id, data FROM {table}"):
                dest.execute(f"INSERT OR IGNORE INTO {table}(id, data) VALUES(?, ?)", (r["id"], r["data"]))
        # viste: con lo stesso id si rinomina
        for r in s.execute("SELECT * FROM views"):
            vid = r["id"]
            if dest.execute("SELECT 1 FROM views WHERE id = ?", (vid,)).fetchone():
                vid = f"{vid}_{uuid.uuid4().hex[:4]}"
            d = json.loads(r["data"])
            d["id"] = vid
            dest.execute("INSERT INTO views(id, name, at, count, data) VALUES(?, ?, ?, ?, ?)",
                         (vid, r["name"], r["at"], r["count"], _dumps(d)))
        # JSON importati: tutti (id nuovi)
        for r in s.execute("SELECT * FROM imports ORDER BY imported_at, id"):
            dest.execute("INSERT INTO imports(anchor, anchor_label, anchor_ntype, anchor_platform, "
                         "filename, content, size, records, dossier, imported_at) "
                         "VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                         (r["anchor"], r["anchor_label"], r["anchor_ntype"], r["anchor_platform"],
                          r["filename"], r["content"], r["size"], r["records"], r["dossier"],
                          r["imported_at"]))
        _bump(dest)
        dest.execute("COMMIT")
    except Exception:
        dest.execute("ROLLBACK")
        raise
    finally:
        s.close()


# ------------------------------------------------------------ versione dati ---
def bump(key="data_version"):
    """Segnala che i dati da cui si costruisce il grafo sono cambiati."""
    with tx() as c:
        _bump(c, key)


def _bump(c, key="data_version"):
    c.execute("INSERT INTO meta(key, value) VALUES(?, '1') ON CONFLICT(key) "
              "DO UPDATE SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT)", (key,))


def version(key="data_version"):
    """Versione dei dati del caso (o del dizionario, che e' globale)."""
    c = gconn() if key == "translit_version" else conn()
    r = c.execute("SELECT value FROM meta WHERE key = ?", (key,)).fetchone()
    return int(r["value"]) if r else 0


def get_meta(key, default=None):
    r = conn().execute("SELECT value FROM meta WHERE key = ?", (key,)).fetchone()
    return r["value"] if r else default


def set_meta(key, value):
    with tx() as c:
        c.execute("INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) "
                  "DO UPDATE SET value = excluded.value", (key, str(value)))


def get_gmeta(key, default=None):
    r = gconn().execute("SELECT value FROM meta WHERE key = ?", (key,)).fetchone()
    return r["value"] if r else default


def set_gmeta(key, value):
    with tx(True) as c:
        c.execute("INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) "
                  "DO UPDATE SET value = excluded.value", (key, str(value)))


# ---------------------------------------------------------------- annotazioni ---
def _dumps(v):
    return json.dumps(v, ensure_ascii=False, sort_keys=True)


def load_annotations():
    """{'added': [...], 'links': [...], 'deleted': [...], 'notes': {}, 'labels': {},
    'edits': {}, 'edge_styles': {}} + '_snap' (stato letto, per il salvataggio)."""
    c = conn()
    ann, snap = {}, {}
    for name, table in _ANN_LISTS.items():
        rows = c.execute(f"SELECT id, data FROM {table} ORDER BY seq").fetchall()
        ann[name] = [json.loads(r["data"]) for r in rows]
        snap[name] = {r["id"]: r["data"] for r in rows}
    for name, table in _ANN_MAPS.items():
        rows = c.execute(f"SELECT id, data FROM {table}").fetchall()
        ann[name] = {r["id"]: json.loads(r["data"]) for r in rows}
        snap[name] = {r["id"]: r["data"] for r in rows}
    ann["_snap"] = snap
    return ann


def _list_key(name, item):
    if name == "links":
        return str(item.get("id") or item.get("edge_id") or "")
    return str(item.get("id") or "")


def save_annotations(ann):
    """Scrive solo le differenze rispetto a quanto letto da load_annotations."""
    snap = ann.get("_snap") or {}
    with tx() as c:
        for name, table in _ANN_LISTS.items():
            old = snap.get(name, {})
            cur, order = {}, []
            for item in ann.get(name) or []:
                k = _list_key(name, item)
                if k and k not in cur:
                    cur[k] = _dumps(item)
                    order.append(k)
            for k in set(old) - set(cur):
                c.execute(f"DELETE FROM {table} WHERE id = ?", (k,))
            base = c.execute(f"SELECT COALESCE(MAX(seq), 0) FROM {table}").fetchone()[0]
            for k in order:
                if k not in old:
                    base += 1
                    c.execute(f"INSERT INTO {table}(id, seq, data) VALUES(?, ?, ?) "
                              f"ON CONFLICT(id) DO UPDATE SET data = excluded.data",
                              (k, base, cur[k]))
                elif old[k] != cur[k]:
                    c.execute(f"UPDATE {table} SET data = ? WHERE id = ?", (cur[k], k))
        for name, table in _ANN_MAPS.items():
            old = snap.get(name, {})
            cur = {str(k): _dumps(v) for k, v in (ann.get(name) or {}).items()}
            for k in set(old) - set(cur):
                c.execute(f"DELETE FROM {table} WHERE id = ?", (k,))
            for k, v in cur.items():
                if old.get(k) != v:
                    c.execute(f"INSERT INTO {table}(id, data) VALUES(?, ?) "
                              f"ON CONFLICT(id) DO UPDATE SET data = excluded.data", (k, v))
    # il prossimo salvataggio dello stesso dizionario parte da qui
    ann["_snap"] = {n: {_list_key(n, i): _dumps(i) for i in ann.get(n) or []}
                    for n in _ANN_LISTS}
    ann["_snap"].update({n: {str(k): _dumps(v) for k, v in (ann.get(n) or {}).items()}
                         for n in _ANN_MAPS})
    return True


# ---------------------------------------------------------------------- viste ---
def load_views():
    rows = conn().execute("SELECT data FROM views ORDER BY at").fetchall()
    return [json.loads(r["data"]) for r in rows]


def get_view(vid):
    r = conn().execute("SELECT data FROM views WHERE id = ?", (vid,)).fetchone()
    return json.loads(r["data"]) if r else None


def save_view(v):
    with tx() as c:
        c.execute("INSERT INTO views(id, name, at, count, data) VALUES(?, ?, ?, ?, ?) "
                  "ON CONFLICT(id) DO UPDATE SET name = excluded.name, at = excluded.at, "
                  "count = excluded.count, data = excluded.data",
                  (v["id"], v.get("name") or v["id"], v.get("at") or _now(),
                   int(v.get("count") or 0), _dumps(v)))


def delete_view(vid):
    with tx() as c:
        return c.execute("DELETE FROM views WHERE id = ?", (vid,)).rowcount


# ------------------------------------------------------------ traslitterazione ---
def translit_dict():
    """{parola: forma latina}; '' = parola nota ma ancora da tradurre."""
    rows = gconn().execute("SELECT word, value FROM translit").fetchall()
    return {r["word"]: r["value"] for r in rows}


def translit_rows(source=None, query="", limit=500, offset=0):
    sql, args = "SELECT * FROM translit WHERE 1=1", []
    if source:
        sql += " AND source = ?"
        args.append(source)
    if query:
        sql += " AND (word LIKE ? OR value LIKE ?)"
        args += [f"%{query}%", f"%{query}%"]
    sql += " ORDER BY updated_at DESC, word LIMIT ? OFFSET ?"
    args += [limit, offset]
    return [dict(r) for r in gconn().execute(sql, args).fetchall()]


def translit_counts():
    rows = gconn().execute("SELECT source, COUNT(*) AS n FROM translit GROUP BY source").fetchall()
    return {r["source"]: r["n"] for r in rows}


def translit_add_pending(words, script_of=None):
    """Parole nuove, da tradurre: non toccano quelle gia' presenti."""
    if not words:
        return 0
    n = 0
    with tx(True) as c:
        for w in words:
            n += c.execute("INSERT OR IGNORE INTO translit(word, value, source, script, updated_at) "
                           "VALUES(?, '', 'pending', ?, ?)",
                           (w, (script_of(w) if script_of else "") or "", _now())).rowcount
        if n:
            _bump(c, "translit_version")
    return n


def translit_save_ai(values, model=""):
    """Traduzioni dell'AI: non sovrascrivono mai una traduzione fatta a mano."""
    if not values:
        return 0
    n = 0
    with tx(True) as c:
        for w, v in values.items():
            n += c.execute(
                "INSERT INTO translit(word, value, source, model, updated_at) "
                "VALUES(?, ?, 'ai', ?, ?) ON CONFLICT(word) DO UPDATE SET "
                "value = excluded.value, source = 'ai', model = excluded.model, "
                "updated_at = excluded.updated_at "
                "WHERE translit.source <> 'manual' OR translit.value = ''",
                (w, v, model, _now())).rowcount
        if n:
            _bump(c, "translit_version")
    return n


def translit_set(word, value):
    """Traduzione fatta a mano (vince sempre); valore vuoto = da tradurre."""
    value = str(value or "").strip()
    with tx(True) as c:
        c.execute("INSERT INTO translit(word, value, source, updated_at) VALUES(?, ?, ?, ?) "
                  "ON CONFLICT(word) DO UPDATE SET value = excluded.value, "
                  "source = excluded.source, model = '', updated_at = excluded.updated_at",
                  (word, value, "manual" if value else "pending", _now()))
        _bump(c, "translit_version")


def translit_delete(word):
    with tx(True) as c:
        n = c.execute("DELETE FROM translit WHERE word = ?", (word,)).rowcount
        if n:
            _bump(c, "translit_version")
        return n


# ------------------------------------------- JSON importati da app terze ---
def add_import(anchor, anchor_label, filename, content, records, dossier=False,
               anchor_ntype="generic", anchor_platform="generic"):
    with tx() as c:
        cur = c.execute("INSERT INTO imports(anchor, anchor_label, anchor_ntype, anchor_platform, "
                        "filename, content, size, records, dossier, imported_at) "
                        "VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        (anchor, anchor_label, anchor_ntype, anchor_platform, filename, content,
                         len(content.encode("utf-8")), records, int(bool(dossier)), _now()))
        _bump(c)
        return cur.lastrowid


def list_imports(anchor=None):
    sql = ("SELECT id, anchor, anchor_label, filename, size, records, dossier, imported_at "
           "FROM imports" + (" WHERE anchor = ?" if anchor else "") +
           " ORDER BY anchor_label COLLATE NOCASE, imported_at, id")
    return [dict(r) for r in conn().execute(sql, (anchor,) if anchor else ()).fetchall()]


def delete_import(iid):
    with tx() as c:
        n = c.execute("DELETE FROM imports WHERE id = ?", (iid,)).rowcount
        if n:
            _bump(c)
        return n


def delete_imports_of(anchors):
    """JSON agganciati a questi nodi (si cancellano insieme al nodo)."""
    anchors = list(anchors)
    if not anchors:
        return 0
    with tx() as c:
        n = c.execute(f"DELETE FROM imports WHERE anchor IN ({','.join('?' * len(anchors))})",
                      anchors).rowcount
        if n:
            _bump(c)
        return n


def iter_imports():
    """Righe dei JSON importati (dict), nell'ordine di importazione."""
    rows = conn().execute("SELECT anchor, anchor_label, anchor_ntype, anchor_platform, "
                          "filename, content, dossier FROM imports ORDER BY imported_at, id").fetchall()
    for r in rows:
        yield dict(r)


# --------------------------------------------- blocchi JSON (indice fonti) ---
def get_blob(key):
    r = gconn().execute("SELECT data FROM blobs WHERE key = ?", (key,)).fetchone()
    return json.loads(r["data"]) if r else None


def set_blob(key, value):
    with tx(True) as c:
        c.execute("INSERT INTO blobs(key, data) VALUES(?, ?) ON CONFLICT(key) "
                  "DO UPDATE SET data = excluded.data", (key, json.dumps(value, ensure_ascii=False)))


def is_empty():
    c = conn()
    for t in ("imports", "ann_added", "ann_links", "ann_notes", "views"):
        if c.execute(f"SELECT 1 FROM {t} LIMIT 1").fetchone():
            return False
    return True
