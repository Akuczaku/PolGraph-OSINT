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

"""Elementi ontologici di interesse investigativo (oltre a persone, telefoni,
email, account, luoghi, veicoli... che hanno una gestione propria in app.py).

Ogni tipo descrive in un solo posto:
    fields   i campi del modulo di inserimento manuale (e della scheda)
    ident    i campi che identificano l'oggetto: se sono tutti compilati, due
             inserimenti uguali sono LO STESSO nodo (una scheda in piu');
             se mancano, ogni inserimento e' un reperto a se' (nodo nuovo)
    label    come si compone l'etichetta del nodo
    ai       le istruzioni per l'estrazione con l'AI
    icon     l'icona (Font Awesome Free, static/vendor/fa)

Tipi di campo: text, number, date, select (options), check.
"""
import re
import unicodedata

# ------------------------------------------------------------ elenchi ---
WEAPON_CATEGORIES = [
    "Pistola semiautomatica", "Revolver", "Pistola mitragliatrice", "Fucile da caccia",
    "Fucile a pompa", "Carabina", "Fucile di precisione", "Fucile d'assalto",
    "Mitragliatrice", "Arma a salve / modificata", "Arma ad aria compressa",
    "Arma artigianale", "Arma bianca (coltello, machete…)", "Balestra / arco",
    "Storditore elettrico / spray", "Altro",
]
CALIBERS = [
    "9x19 Parabellum", "9x21 IMI", "7,65 Browning (.32 ACP)", "6,35 Browning (.25 ACP)",
    ".22 LR", ".38 Special", ".357 Magnum", ".44 Magnum", ".45 ACP", ".40 S&W",
    "7,62x39", "5,56x45 NATO", "7,62x51 NATO (.308 Win)", ".30-06", "12 gauge",
    "16 gauge", "20 gauge", "4,5 mm (aria compressa)",
]
EXPLOSIVES = [
    "Dinamite", "TNT (tritolo)", "Esplosivo plastico (C4 / Semtex)", "Pentrite (PETN)",
    "Polvere nera", "Polvere da sparo infume", "ANFO", "TATP", "Nitroglicerina",
    "Gelatina esplosiva", "Ordigno esplosivo improvvisato (IED)", "Bomba a mano",
    "Detonatori / inneschi", "Miccia detonante", "Artifici pirotecnici illegali",
    "Altro",
]
DRUGS = [
    "Cocaina", "Crack", "Eroina", "Hashish", "Marijuana", "Olio di cannabis",
    "Piante di cannabis", "MDMA / Ecstasy", "Anfetamina", "Metanfetamina",
    "Ketamina", "LSD", "Funghi allucinogeni (psilocibina)", "Mescalina",
    "Fentanyl e derivati", "Oppio", "Morfina", "Metadone", "Buprenorfina",
    "Ossicodone / oppioidi farmaceutici", "Benzodiazepine", "GHB / GBL",
    "Cannabinoidi sintetici", "Catinoni sintetici (mefedrone…)", "Khat", "Kratom",
    "Precursori chimici", "Sostanza da taglio", "Sostanza non identificata", "Altro",
]
DRUG_UNITS = ["g", "kg", "mg", "dosi", "pasticche", "piante", "ml", "francobolli", "confezioni"]
CURRENCIES = ["EUR", "USD", "GBP", "CHF", "LYD", "TND", "MAD", "EGP", "DZD", "TRY",
              "ALL", "RON", "RUB", "UAH", "CNY", "AED", "SAR", "Altro"]
CRYPTO_CHAINS = ["Bitcoin", "Ethereum", "Tether (USDT) - TRON", "Tether (USDT) - Ethereum",
                 "Monero", "Litecoin", "Solana", "BNB Chain", "Altro"]
ID_DOCS = ["Carta d'identità", "Passaporto", "Patente di guida", "Permesso di soggiorno",
           "Codice fiscale / tessera sanitaria", "Visto", "Documento di viaggio",
           "Tessera di riconoscimento", "Altro"]
DEVICES = ["Smartphone", "Cellulare", "Tablet", "PC portatile", "PC fisso", "Hard disk / SSD",
           "Chiavetta USB / memory card", "Router / modem", "Dispositivo GPS", "Criptofonino",
           "Altro"]
ORG_TYPES = ["Società di capitali", "Società di persone", "Ditta individuale",
             "Associazione", "Ente pubblico", "Gruppo criminale", "Clan / cosca",
             "Organizzazione terroristica", "Altro"]
CRIMES = [
    "Spaccio di stupefacenti", "Traffico di stupefacenti", "Detenzione di stupefacenti",
    "Detenzione / porto illegale di armi", "Traffico di armi", "Rapina", "Furto",
    "Ricettazione", "Estorsione", "Usura", "Riciclaggio", "Autoriciclaggio",
    "Truffa", "Frode informatica", "Accesso abusivo a sistema informatico",
    "Falso documentale", "Omicidio", "Tentato omicidio", "Lesioni", "Minacce",
    "Sequestro di persona", "Violenza sessuale", "Maltrattamenti",
    "Sfruttamento della prostituzione", "Tratta di esseri umani",
    "Favoreggiamento dell'immigrazione clandestina", "Associazione per delinquere",
    "Associazione di tipo mafioso", "Terrorismo", "Contrabbando", "Corruzione",
    "Incendio / danneggiamento", "Arresto / fermo", "Perquisizione / sequestro",
    "Altro",
]
FIN_DOCS = [
    "Fattura", "Ricevuta / scontrino", "Estratto conto", "Bonifico / disposizione di pagamento",
    "Contratto", "Contratto di locazione", "Atto di compravendita", "Polizza assicurativa",
    "Bilancio / nota integrativa", "Busta paga", "Dichiarazione dei redditi",
    "Documento di trasporto (DDT)", "Libro contabile / registro",
    "Contabilità occulta / pizzino", "Visura camerale", "Altro",
]
LEGAL_DOCS = [
    "Verbale di perquisizione", "Verbale di sequestro", "Verbale di arresto / fermo",
    "Verbale di sommarie informazioni", "Verbale di interrogatorio", "Denuncia / querela",
    "Esposto", "Informativa di reato", "Annotazione di polizia giudiziaria",
    "Decreto di perquisizione", "Decreto di sequestro", "Decreto di intercettazione",
    "Ordinanza di custodia cautelare", "Avviso di garanzia",
    "Avviso di conclusione indagini (415-bis)", "Richiesta di rinvio a giudizio",
    "Decreto che dispone il giudizio", "Sentenza", "Mandato di arresto europeo",
    "Rogatoria internazionale", "Relazione di servizio", "Altro",
]
PROPERTY_TYPES = ["Appartamento", "Villa / casa indipendente", "Box / garage", "Cantina",
                  "Magazzino / capannone", "Negozio / locale", "Ufficio", "Terreno", "Altro"]
VALUABLE_TYPES = ["Oro / gioielli", "Orologi di pregio", "Metalli preziosi (lingotti)",
                  "Pietre preziose", "Opere d'arte", "Titoli / obbligazioni",
                  "Buoni fruttiferi", "Beni di lusso", "Altro"]
CARD_CIRCUITS = ["Visa", "Mastercard", "Maestro", "American Express", "Postepay",
                 "Carta prepagata", "Altro"]


def F(key, label, kind="text", options=None, en=None, ph=""):
    return {"key": key, "label": label, "en": en or label, "type": kind,
            "options": options or [], "ph": ph}


# ------------------------------------------------------------ i tipi ---
TYPES = {
    "weapon": {
        "label": "Arma", "en": "Weapon", "group": "Armi",
        "icon": "gun", "color": "#475569",
        "fields": [
            F("categoria", "Categoria", "select", WEAPON_CATEGORIES, "Category"),
            F("marca", "Marca", en="Make", ph="es. Beretta"),
            F("modello", "Modello", en="Model", ph="es. 92FS"),
            F("calibro", "Calibro", "select", CALIBERS + ["Altro"], "Calibre"),
            F("matricola", "Matricola", en="Serial number", ph="numero di matricola"),
            F("matricola_abrasa", "Matricola abrasa / illeggibile", "check", en="Serial number removed"),
            F("stato", "Stato", "select", ["Sequestrata", "Detenuta legalmente", "Denunciata rubata",
                                           "Rinvenuta", "Consegnata", "Altro"], "Status"),
        ],
        # con la matricola l'arma e' univoca: due sequestri della stessa arma sono
        # lo stesso nodo (la marca spesso non viene scritta: non conta).
        # Senza matricola (o abrasa) ogni inserimento e' un reperto a se'.
        "ident": ["matricola"],
        "label_fmt": ["categoria", "marca", "modello", "calibro:cal. {}", "matricola:matr. {}"],
        "value": "modello",
        "ai": 'weapon: firearms, bladed weapons and similar. fields: categoria (one of the list), '
              'marca, modello, calibro, matricola (serial number, "" if unknown), '
              'matricola_abrasa (true if the serial number is removed), stato.',
    },
    "explosive": {
        "label": "Esplosivo / ordigno", "en": "Explosive", "group": "Armi",
        "icon": "explosion", "color": "#9a3412",
        "fields": [
            F("tipo", "Tipo", "select", EXPLOSIVES, "Type"),
            F("quantita", "Quantità", "number", en="Quantity"),
            F("unita", "Unità", "select", ["g", "kg", "pezzi", "metri"], "Unit"),
            F("descrizione", "Descrizione", en="Description", ph="es. innesco elettrico, timer"),
        ],
        "ident": [], "label_fmt": ["tipo", "quantita+unita"], "value": "tipo",
        "ai": 'explosive: explosives and devices. fields: tipo (one of the list), quantita (number), '
              'unita (g, kg, pezzi, metri), descrizione.',
    },
    "ammo": {
        "label": "Munizioni", "en": "Ammunition", "group": "Armi",
        "icon": "burst", "color": "#78716c",
        "fields": [
            F("calibro", "Calibro", "select", CALIBERS + ["Altro"], "Calibre"),
            F("quantita", "Quantità (colpi)", "number", en="Rounds"),
            F("marca", "Marca", en="Make"),
            F("descrizione", "Descrizione", en="Description"),
        ],
        "ident": [], "label_fmt": ["Munizioni", "calibro:cal. {}", "quantita:{} colpi"], "value": "calibro",
        "ai": 'ammo: ammunition. fields: calibro, quantita (number of rounds), marca, descrizione.',
    },
    "drug": {
        "label": "Sostanza stupefacente", "en": "Narcotic drug", "group": "Stupefacenti",
        "icon": "pills", "color": "#16a34a",
        "fields": [
            F("sostanza", "Sostanza", "select", DRUGS, "Substance"),
            F("quantita", "Quantità", "number", en="Quantity"),
            F("unita", "Unità", "select", DRUG_UNITS, "Unit"),
            F("purezza", "Principio attivo / purezza (%)", "number", en="Purity (%)"),
            F("confezionamento", "Confezionamento", en="Packaging", ph="es. 10 involucri in cellophane"),
            F("descrizione", "Descrizione", en="Description"),
        ],
        # ogni sequestro di sostanza e' un reperto a se'
        "ident": [], "label_fmt": ["sostanza", "quantita+unita"], "value": "sostanza",
        "ai": 'drug: narcotic drugs / seizures. fields: sostanza (one of the list), quantita (number), '
              'unita (g, kg, mg, dosi, pasticche, piante, ml, francobolli, confezioni), '
              'purezza (percentage, number), confezionamento, descrizione. '
              'One node per substance and quantity.',
    },
    "cash": {
        "label": "Denaro contante", "en": "Cash", "group": "Valori",
        "icon": "money-bill-wave", "color": "#15803d",
        "fields": [
            F("importo", "Importo", "number", en="Amount"),
            F("valuta", "Valuta", "select", CURRENCIES, "Currency"),
            F("tagli", "Tagli", en="Denominations", ph="es. 30 da 50 €, 20 da 20 €"),
            F("seriali", "Numeri di serie", en="Serial numbers"),
            F("false", "Banconote false", "check", en="Counterfeit"),
            F("descrizione", "Descrizione", en="Description"),
        ],
        "ident": [], "label_fmt": ["importo+valuta", "false:(false)"], "value": "importo",
        "ai": 'cash: cash money. fields: importo (number), valuta (EUR, USD...), tagli, seriali, '
              'false (true if counterfeit), descrizione.',
    },
    "cheque": {
        "label": "Assegno / titolo di credito", "en": "Cheque", "group": "Valori",
        "icon": "money-check", "color": "#0f766e",
        "fields": [
            F("tipo", "Tipo", "select", ["Assegno bancario", "Assegno circolare", "Assegno postale",
                                         "Cambiale", "Vaglia", "Altro"], "Type"),
            F("banca", "Banca / emittente", en="Bank"),
            F("numero", "Numero", en="Number"),
            F("importo", "Importo", "number", en="Amount"),
            F("valuta", "Valuta", "select", CURRENCIES, "Currency"),
            F("data", "Data", "date", en="Date"),
            F("traente", "Traente / emittente", en="Drawer"),
            F("beneficiario", "Beneficiario", en="Payee"),
        ],
        "ident": ["numero"],
        "label_fmt": ["tipo", "numero:n. {}", "importo+valuta"], "value": "numero",
        "ai": 'cheque: cheques, bills of exchange. fields: tipo, banca, numero, importo (number), valuta, '
              'data (YYYY-MM-DD), traente, beneficiario.',
    },
    "valuable": {
        "label": "Beni di valore", "en": "Valuables", "group": "Valori",
        "icon": "gem", "color": "#a16207",
        "fields": [
            F("tipo", "Tipo", "select", VALUABLE_TYPES, "Type"),
            F("descrizione", "Descrizione", en="Description", ph="es. Rolex Submariner"),
            F("valore", "Valore stimato", "number", en="Estimated value"),
            F("valuta", "Valuta", "select", CURRENCIES, "Currency"),
            F("seriale", "Numero di serie", en="Serial number"),
        ],
        "ident": ["seriale"], "label_fmt": ["tipo", "descrizione", "valore+valuta"], "value": "descrizione",
        "ai": 'valuable: gold, jewels, watches, works of art, securities. fields: tipo, descrizione, '
              'valore (number), valuta, seriale.',
    },
    "bankaccount": {
        "label": "Conto bancario (IBAN)", "en": "Bank account", "group": "Finanza",
        "icon": "building-columns", "color": "#1d4ed8",
        "fields": [
            F("iban", "IBAN / numero di conto", en="IBAN / account number"),
            F("banca", "Banca", en="Bank"),
            F("bic", "BIC / SWIFT"),
            F("intestatario", "Intestatario", en="Holder"),
        ],
        "ident": ["iban"], "label_fmt": ["iban", "banca"], "value": "iban", "norm": {"iban": "compact"},
        "ai": 'bankaccount: bank accounts. fields: iban (IBAN or account number), banca, bic, intestatario.',
    },
    "card": {
        "label": "Carta di pagamento", "en": "Payment card", "group": "Finanza",
        "icon": "credit-card", "color": "#1e40af",
        "fields": [
            F("numero", "Numero carta", en="Card number"),
            F("circuito", "Circuito", "select", CARD_CIRCUITS, "Network"),
            F("banca", "Banca emittente", en="Issuer"),
            F("intestatario", "Intestatario", en="Holder"),
            F("scadenza", "Scadenza", en="Expiry", ph="MM/AA"),
        ],
        "ident": ["numero"], "label_fmt": ["circuito", "numero"], "value": "numero", "norm": {"numero": "digits"},
        "ai": 'card: payment cards. fields: numero, circuito, banca, intestatario, scadenza.',
    },
    "crypto": {
        "label": "Wallet criptovalute", "en": "Crypto wallet", "group": "Finanza",
        "icon": "bitcoin", "color": "#c2410c",
        "fields": [
            F("indirizzo", "Indirizzo del wallet", en="Wallet address"),
            F("blockchain", "Blockchain", "select", CRYPTO_CHAINS),
            F("exchange", "Exchange / servizio", en="Exchange"),
        ],
        "ident": ["indirizzo"], "label_fmt": ["blockchain", "indirizzo"], "value": "indirizzo",
        "norm": {"indirizzo": "compact_case"},
        "ai": 'crypto: cryptocurrency wallets. fields: indirizzo (address), blockchain, exchange.',
    },
    "document": {
        "label": "Documento d'identità", "en": "ID document", "group": "Documenti",
        "icon": "id-card", "color": "#0e7490",
        "fields": [
            F("tipo", "Tipo", "select", ID_DOCS, "Type"),
            F("numero", "Numero", en="Number"),
            F("paese", "Paese / autorità di rilascio", en="Issuing country"),
            F("rilascio", "Data di rilascio", "date", en="Issue date"),
            F("scadenza", "Scadenza", "date", en="Expiry date"),
            F("falso", "Documento falso / contraffatto", "check", en="Forged"),
        ],
        "ident": ["numero"],
        "label_fmt": ["tipo", "numero", "falso:(falso)"], "value": "numero", "norm": {"numero": "compact"},
        "ai": 'document: identity documents (carta d\'identità, passaporto, patente, permesso di '
              'soggiorno, codice fiscale...). fields: tipo (one of the list), numero, paese, '
              'rilascio (YYYY-MM-DD), scadenza (YYYY-MM-DD), falso (true if forged).',
    },
    "findoc": {
        "label": "Documento finanziario / commerciale", "en": "Financial document", "group": "Documenti",
        "icon": "file-invoice-dollar", "color": "#0f766e",
        "fields": [
            F("tipo", "Tipo", "select", FIN_DOCS, "Type"),
            F("numero", "Numero", en="Number"),
            F("data", "Data", "date", en="Date"),
            F("emittente", "Emittente", en="Issuer", ph="es. ditta, banca"),
            F("destinatario", "Destinatario / controparte", en="Recipient"),
            F("importo", "Importo", "number", en="Amount"),
            F("valuta", "Valuta", "select", CURRENCIES, "Currency"),
            F("descrizione", "Descrizione / causale", en="Description"),
        ],
        # una fattura e' univoca per emittente + numero
        "ident": ["emittente", "numero"],
        "label_fmt": ["tipo", "numero:n. {}", "data:del {date}", "importo+valuta"], "value": "numero",
        "ai": 'findoc: financial and commercial documents (invoices, receipts, bank statements, '
              'transfers, contracts, leases, deeds, insurance, payslips, tax returns, ledgers, '
              '"pizzini" with accounts). fields: tipo (one of the list), numero, data (YYYY-MM-DD), '
              'emittente, destinatario, importo (number), valuta, descrizione.',
    },
    "legaldoc": {
        "label": "Atto / documento legale", "en": "Legal document", "group": "Documenti",
        "icon": "file-contract", "color": "#57534e",
        "fields": [
            F("tipo", "Tipo di atto", "select", LEGAL_DOCS, "Type"),
            F("numero", "Numero / protocollo", en="Number / reference"),
            F("data", "Data", "date", en="Date"),
            F("autorita", "Autorità / ufficio", en="Authority", ph="es. Procura della Repubblica di Napoli"),
            F("procedimento", "N. procedimento (RGNR)", en="Case number"),
            F("redattore", "Redatto da", en="Author", ph="es. ufficiale di PG"),
            F("descrizione", "Oggetto / descrizione", en="Subject"),
        ],
        "ident": ["tipo", "numero"],
        "label_fmt": ["tipo", "numero:n. {}", "data:del {date}"], "value": "numero",
        "ai": 'legaldoc: legal and police documents (verbali, denunce, informative, annotazioni, '
              'decreti, ordinanze, avvisi, sentenze, MAE, rogatorie). fields: tipo (one of the list), '
              'numero (reference number), data (YYYY-MM-DD), autorita (issuing office), '
              'procedimento (case number), redattore, descrizione.',
    },
    "device": {
        "label": "Dispositivo elettronico", "en": "Device", "group": "Dispositivi",
        "icon": "mobile-screen", "color": "#334155",
        "fields": [
            F("tipo", "Tipo", "select", DEVICES, "Type"),
            F("marca", "Marca", en="Make"),
            F("modello", "Modello", en="Model"),
            F("imei", "IMEI / numero di serie", en="IMEI / serial number"),
            F("descrizione", "Descrizione", en="Description"),
        ],
        "ident": ["imei"], "label_fmt": ["tipo", "marca", "modello", "imei:IMEI {}"], "value": "imei",
        "norm": {"imei": "compact"},
        "ai": 'device: phones, computers, storage. fields: tipo, marca, modello, imei (IMEI or serial), '
              'descrizione. A phone NUMBER is a "phone" node, not a device.',
    },
    "organization": {
        "label": "Organizzazione / azienda", "en": "Organization", "group": "Soggetti",
        "icon": "building", "color": "#7c2d12",
        "fields": [
            F("nome", "Denominazione", en="Name"),
            F("tipo", "Tipo", "select", ORG_TYPES, "Type"),
            F("piva", "Partita IVA / codice fiscale", en="VAT / tax number"),
            F("sede", "Sede", en="Registered office"),
        ],
        # con la partita IVA e' univoca; senza, lo e' il nome
        "ident": ["piva"], "ident_alt": ["nome"], "label_fmt": ["nome", "piva:P.IVA {}"], "value": "nome",
        "norm": {"piva": "compact"},
        "ai": 'organization: companies, associations, criminal groups/clans. fields: nome, tipo, '
              'piva (VAT or tax number), sede.',
    },
    "event": {
        "label": "Evento / reato", "en": "Event / offence", "group": "Fatti",
        "icon": "gavel", "color": "#831843",
        "fields": [
            F("tipo", "Tipo di reato / evento", "select", CRIMES, "Type"),
            F("data", "Data", "date", en="Date"),
            F("luogo", "Luogo", en="Place"),
            F("procedimento", "N. procedimento (RGNR)", en="Case number"),
            F("descrizione", "Descrizione", en="Description"),
        ],
        "ident": ["procedimento", "tipo"],
        "label_fmt": ["tipo", "data:{date}", "procedimento:RGNR {}"], "value": "tipo",
        "ai": 'event: offences and investigative events (arrests, searches, seizures). fields: tipo '
              '(one of the list), data (YYYY-MM-DD), luogo, procedimento (case number), descrizione. '
              'Link the people involved to it (label e.g. "indagato", "vittima", "arrestato").',
    },
    "property": {
        "label": "Immobile", "en": "Real estate", "group": "Beni",
        "icon": "house", "color": "#4338ca",
        "fields": [
            F("tipo", "Tipo", "select", PROPERTY_TYPES, "Type"),
            F("comune", "Comune", en="Town"),
            F("indirizzo", "Indirizzo", en="Address"),
            F("catasto", "Dati catastali (foglio / particella / sub)", en="Land registry data"),
            F("descrizione", "Descrizione", en="Description"),
        ],
        "ident": ["comune", "catasto"],
        "label_fmt": ["tipo", "comune", "indirizzo"], "value": "indirizzo",
        "ai": 'property: real estate (flats, garages, warehouses, land). fields: tipo, comune, '
              'indirizzo, catasto (land registry data), descrizione.',
    },
}

# icona per sostanza (piu' riconoscibile della pillola generica)
DRUG_ICONS = {
    "Hashish": "cannabis", "Marijuana": "cannabis", "Olio di cannabis": "cannabis",
    "Piante di cannabis": "cannabis", "Cannabinoidi sintetici": "cannabis",
    "Eroina": "syringe", "Fentanyl e derivati": "syringe", "Morfina": "syringe",
    "Oppio": "syringe", "Metadone": "syringe",
    "Cocaina": "vial", "Crack": "vial", "Precursori chimici": "vial",
}
DOC_ICONS = {"Passaporto": "passport"}
FINDOC_ICONS = {"Ricevuta / scontrino": "receipt", "Estratto conto": "receipt",
                "Bonifico / disposizione di pagamento": "receipt", "Contratto": "file-contract",
                "Contratto di locazione": "file-contract", "Atto di compravendita": "file-contract"}
LEGALDOC_ICONS = {"Sentenza": "scale-balanced", "Decreto che dispone il giudizio": "scale-balanced"}
DEVICE_ICONS = {"PC portatile": "laptop", "PC fisso": "laptop"}

# icone dei tipi gia' esistenti (Font Awesome Free)
BASE_ICONS = {
    "target": "user-secret", "name": "user", "phone": "phone", "email": "envelope",
    "username": "at", "generic": "circle-question", "vehicle": "car", "link": "link",
    "text": "file-lines", "place": "location-dot", "latin": "language", "photo": "image",
    "domain": "globe", "breach": "shield-halved",
}

# nomi con cui l'utente o l'AI indicano i tipi (import CSV, AI)
ALIASES = {
    "weapon": {"arma", "armi", "weapon", "pistola", "fucile", "revolver", "firearm", "gun", "rifle"},
    "explosive": {"esplosivo", "esplosivi", "ordigno", "bomba", "explosive", "explosives"},
    "ammo": {"munizioni", "munizione", "cartucce", "proiettili", "ammo", "ammunition"},
    "drug": {"droga", "stupefacente", "stupefacenti", "sostanza", "narcotic", "drug", "drugs"},
    "cash": {"contanti", "denaro", "soldi", "banconote", "cash", "money"},
    "cheque": {"assegno", "assegni", "cambiale", "cheque", "check"},
    "valuable": {"preziosi", "gioielli", "valori", "orologio", "valuable", "valuables", "jewels"},
    "bankaccount": {"conto", "iban", "contocorrente", "bankaccount", "account bancario"},
    "card": {"carta", "cartadicredito", "bancomat", "card", "creditcard"},
    "crypto": {"crypto", "wallet", "bitcoin", "criptovaluta", "criptovalute"},
    "document": {"documento", "passaporto", "patente", "cartaidentita", "document", "passport", "id"},
    "findoc": {"fattura", "fatture", "ricevuta", "estrattoconto", "contratto", "bonifico",
               "documentofinanziario", "invoice", "receipt", "contract"},
    "legaldoc": {"verbale", "denuncia", "querela", "decreto", "ordinanza", "sentenza",
                 "informativa", "annotazione", "atto", "documentolegale", "legaldocument"},
    "device": {"dispositivo", "imei", "smartphone", "cellulare", "computer", "device"},
    "organization": {"organizzazione", "azienda", "societa", "ditta", "impresa", "clan",
                     "organization", "organisation", "company"},
    "event": {"evento", "reato", "fatto", "arresto", "perquisizione", "sequestro", "event", "crime"},
    "property": {"immobile", "appartamento", "casa", "garage", "box", "terreno", "property"},
}


# ---------------------------------------------------------- funzioni ---
def _fold(s):
    s = unicodedata.normalize("NFKD", str(s or "")).casefold()
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", re.sub(r"[^\w/]+", " ", s)).strip()


def _norm_value(kind, v):
    v = str(v or "").strip()
    if kind == "compact":
        return re.sub(r"[\s.\-/]+", "", v).upper()
    if kind == "compact_case":                      # indirizzi crypto: maiuscole significative
        return re.sub(r"\s+", "", v)
    if kind == "digits":
        return re.sub(r"\D", "", v)
    return _fold(v)


def type_of(name):
    """'pistola' / 'Arma' / 'weapon' -> 'weapon' (None se non e' un tipo ontologico)."""
    n = re.sub(r"[^a-z]", "", _fold(name))
    if n in TYPES:
        return n
    for t, al in ALIASES.items():
        if n in {re.sub(r"[^a-z]", "", _fold(a)) for a in al}:
            return t
    return None


_SERIAL_GONE = re.compile(r"^\W*(abras|limat|cancellat|illeggibil|assent|rimoss|non leggibil|"
                          r"removed|obliterat|none|n\.?d\.?|nessuna)", re.I)


def key_is_serial(ntype, key):
    return ntype == "weapon" and key == "matricola"


def clean_fields(ntype, raw):
    """Solo i campi previsti dal tipo, ripuliti. Le opzioni fuori elenco si
    tengono (l'utente o l'AI possono scrivere un valore non previsto)."""
    spec = TYPES[ntype]
    out = {}
    raw = raw if isinstance(raw, dict) else {}
    for f in spec["fields"]:
        v = raw.get(f["key"])
        if f["type"] == "check":
            if v is True or str(v or "").strip().lower() in ("1", "true", "si", "sì", "yes", "on", "x"):
                out[f["key"]] = True
            continue
        v = re.sub(r"\s+", " ", str(v if v is not None else "")).strip()[:300]
        if not v:
            continue
        if f["type"] == "number":
            n = v.replace(" ", "").replace("€", "").replace("$", "")
            if re.fullmatch(r"\d{1,3}(\.\d{3})+(,\d+)?", n):      # 15.000,50
                n = n.replace(".", "").replace(",", ".")
            else:
                n = n.replace(",", ".")
            try:
                float(n)
                v = n
            except ValueError:
                pass                                          # si tiene il testo
        if key_is_serial(ntype, f["key"]) and _SERIAL_GONE.search(v):
            out["matricola_abrasa"] = True                    # "abrasa", "limata"...
            continue
        if f["type"] == "select" and f["options"]:
            hit = next((o for o in f["options"] if _fold(o) == _fold(v)), None)
            v = hit or v
        out[f["key"]] = v
    return out


def _fmt_num(v):
    try:
        x = float(v)
    except (TypeError, ValueError):
        return str(v)
    if x == int(x):
        return f"{int(x):,}".replace(",", ".")
    s = f"{x:,.2f}".rstrip("0")                      # 1.50 -> 1.5
    return s.replace(",", "X").replace(".", ",").replace("X", ".")


def label_of(ntype, fields):
    """Etichetta del nodo dai campi, secondo 'label_fmt'."""
    parts = []
    for item in TYPES[ntype]["label_fmt"]:
        if ":" in item:                                  # campo:formato
            key, fmt = item.split(":", 1)
            v = fields.get(key)
            if not v:
                continue
            if v is True:
                parts.append(fmt)
            elif "{date}" in fmt:
                d = f"{v[8:10]}/{v[5:7]}/{v[:4]}" if re.fullmatch(r"\d{4}-\d{2}-\d{2}", v) else v
                parts.append(fmt.replace("{date}", d))
            else:
                pre = fmt.split("{}")[0].strip()
                # 'RGNR 1234/2026' con formato 'RGNR {}': niente prefisso doppio
                parts.append(str(v) if pre and _fold(str(v)).startswith(_fold(pre)) else fmt.format(v))
        elif "+" in item:                                # quantita+unita, importo+valuta
            a, b = item.split("+", 1)
            if fields.get(a):
                num = _fmt_num(fields[a])
                parts.append(f"{num} {fields.get(b, '')}".strip())
        elif item in fields:
            v = fields[item]
            if v is not True:
                parts.append(str(v))
        elif not any(f["key"] == item for f in TYPES[ntype]["fields"]):
            parts.append(item)                           # testo fisso ("Munizioni")
    lab = " ".join(p for p in parts if p).strip()
    return lab or TYPES[ntype]["label"]


# campi identificativi che sono parole (si confrontano senza accenti e maiuscole);
# gli altri sono codici (matricola, numero, IBAN...): senza spazi e punteggiatura
_WORD_KEYS = {"marca", "banca", "tipo", "comune", "nome", "blockchain"}


def ident_of(ntype, fields):
    """Chiave d'identita' ('' = reperto senza identificativo: nodo nuovo)."""
    spec = TYPES[ntype]
    norm = spec.get("norm", {})
    need = spec.get("ident_min") or spec.get("ident") or []
    if not need:
        return ""
    if fields.get("matricola_abrasa") and ntype == "weapon":
        return ""
    if all(fields.get(k) for k in need):
        keys = spec["ident"]
        vals = [_norm_value(norm.get(k) or ("fold" if k in _WORD_KEYS else "compact"),
                            fields.get(k, "")) for k in keys]
        return "|".join(vals)
    alt = spec.get("ident_alt")
    if alt and all(fields.get(k) for k in alt):
        return "name|" + "|".join(_fold(fields[k]) for k in alt)
    return ""


def icon_of(ntype, fields):
    if ntype == "drug":
        return DRUG_ICONS.get(fields.get("sostanza"), TYPES[ntype]["icon"])
    if ntype == "document":
        return DOC_ICONS.get(fields.get("tipo"), TYPES[ntype]["icon"])
    if ntype == "findoc":
        return FINDOC_ICONS.get(fields.get("tipo"), TYPES[ntype]["icon"])
    if ntype == "legaldoc":
        return LEGALDOC_ICONS.get(fields.get("tipo"), TYPES[ntype]["icon"])
    if ntype == "device":
        return DEVICE_ICONS.get(fields.get("tipo"), TYPES[ntype]["icon"])
    return TYPES[ntype]["icon"] if ntype in TYPES else BASE_ICONS.get(ntype, "circle-question")


def raw_of(ntype, fields):
    """Campi leggibili per la scheda: {'Categoria': 'Pistola', ...}."""
    out = {}
    for f in TYPES[ntype]["fields"]:
        v = fields.get(f["key"])
        if v in (None, "", False):
            continue
        out[f["label"]] = "sì" if v is True else v
    return out


def ai_rules():
    """Istruzioni per il prompt dell'AI (una riga per tipo, con gli elenchi)."""
    lines = ["  For select fields choose the option whose words best match the TEXT "
             "(e.g. \"traffico di stupefacenti\" -> \"Traffico di stupefacenti\", not \"Spaccio\").",
             "  Link labels for items: seized items linked from the person with \"sequestrato\" "
             "(or \"detiene\", \"possiede\", \"utilizza\", \"intestatario\" when the TEXT says so); "
             "the person linked to an offence with \"indagato\" / \"arrestato\" / \"vittima\"; "
             "seized items linked to the offence/event with \"sequestrato nel\"."]
    for t, spec in TYPES.items():
        lines.append(f"- {spec['ai']}")
        for f in spec["fields"]:
            if f["type"] == "select" and len(f["options"]) > 2:
                lines.append(f"    {f['key']} options: " + "; ".join(f["options"]))
    return "\n".join(lines)


def public():
    """Configurazione per il client (modulo di inserimento, icone, colori)."""
    return {t: {"label": s["label"], "en": s["en"], "group": s["group"], "icon": s["icon"],
                "color": s["color"], "fields": s["fields"], "order": i}
            for i, (t, s) in enumerate(TYPES.items())}
