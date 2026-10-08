# -*- coding: utf-8 -*-
from __future__ import annotations
import argparse, csv, json, sqlite3
from pathlib import Path

def read_csv(path: Path, encoding='utf-8-sig', delimiter=None):
    txt = path.read_text(encoding=encoding, errors='ignore')
    if delimiter is None:
        sample = "\n".join(txt.splitlines()[:5])
        scores = {d: sample.count(d) for d in [',',';','\t','|']}
        delimiter = max(scores, key=scores.get)
    rows = []
    reader = csv.DictReader(txt.splitlines(), delimiter=delimiter)
    for r in reader:
        rows.append({str(k).strip().lower(): str(v or '').strip() for k,v in r.items()})
    return rows

def read_json(path: Path):
    data = json.loads(path.read_text(encoding='utf-8'))
    if isinstance(data, dict) and 'nodes' in data and 'edges' in data:
        return data, True
    if isinstance(data, list):
        return [{str(k).strip().lower(): str(v or '').strip() for k,v in item.items()} for item in data], False
    raise ValueError('Nieobsługiwany JSON')

def read_sqlite(path: Path, query: str):
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(query).fetchall()
        return [{str(k).strip().lower(): str(r[k] or '').strip() for k in r.keys()} for r in rows]
    finally:
        conn.close()

def to_graph(rows, source_name='import', node_type='entity'):
    nodes, edges = [], []
    seen_nodes, seen_edges = set(), set()

    def push_node(id_, label, extra=None, typ=None):
        key = str(id_)
        if not key or key in seen_nodes: return
        seen_nodes.add(key)
        d = {'id': key, 'label': str(label or id_), 'type': typ or node_type, 'source_db': source_name}
        if extra: d.update(extra)
        nodes.append({'data': d})

    def push_edge(s, t, rel):
        key = f"{s}|{t}|{rel}"
        if not s or not t or key in seen_edges: return
        seen_edges.add(key)
        edges.append({'data': {'id': 'E:' + key, 'source': str(s), 'target': str(t), 'label': rel, 'rel': rel, 'source_db': source_name}})

    for i, row in enumerate(rows, 1):
        label = row.get('label') or row.get('name') or row.get('nazwa') or row.get('osoba') or row.get('firma') or row.get('imię i nazwisko') or row.get('imie i nazwisko')
        if not label:
            continue
        base = row.get('id') or label
        push_node(base, label, row)

        mapping = [
            ('telefon', 'telefon', 'korzysta z telefonu'),
            ('phone', 'telefon', 'korzysta z telefonu'),
            ('email', 'e-mail', 'korzysta z adresu e-mail'),
            ('e-mail', 'e-mail', 'korzysta z adresu e-mail'),
            ('adres', 'adres', 'mieszka pod adresem'),
            ('address', 'adres', 'mieszka pod adresem'),
            ('firma', 'firma', 'powiązany z'),
            ('company', 'firma', 'powiązany z'),
            ('nip', 'NIP', 'powiązany z'),
            ('regon', 'REGON', 'powiązany z'),
            ('krs', 'KRS', 'powiązany z'),
            ('vin', 'VIN', 'powiązany z'),
        ]
        for col, typ, rel in mapping:
            v = row.get(col, '').strip()
            if not v:
                continue
            nid = f"{typ}:{v}"
            push_node(nid, v, typ=typ)
            push_edge(base, nid, rel)

    return {'nodes': nodes, 'edges': edges}

def main():
    ap = argparse.ArgumentParser(description='Moje bazy -> Graph JSON')
    ap.add_argument('input', help='CSV / JSON / SQLite')
    ap.add_argument('--sqlite-query', help='Zapytanie SQL dla pliku SQLite')
    ap.add_argument('--source-name', default='my_database', help='Nazwa źródła danych')
    ap.add_argument('--output', default='output.graph.json', help='Plik wynikowy Graph JSON')
    args = ap.parse_args()

    path = Path(args.input)
    ext = path.suffix.lower()

    if ext in ('.csv', '.txt'):
        rows = read_csv(path)
        graph = to_graph(rows, source_name=args.source_name)
    elif ext == '.json':
        data, is_graph = read_json(path)
        graph = data if is_graph else to_graph(data, source_name=args.source_name)
    elif ext in ('.sqlite', '.db'):
        if not args.sqlite_query:
            raise SystemExit('Dla SQLite podaj --sqlite-query')
        rows = read_sqlite(path, args.sqlite_query)
        graph = to_graph(rows, source_name=args.source_name)
    else:
        raise SystemExit('Nieobsługiwany format. Użyj CSV / JSON / SQLite.')

    out = Path(args.output)
    out.write_text(json.dumps(graph, ensure_ascii=False, indent=2), encoding='utf-8')
    print(out.resolve())

if __name__ == '__main__':
    main()
