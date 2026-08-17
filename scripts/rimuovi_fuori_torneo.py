#!/usr/bin/env python3
"""Rimuove dal listone i giocatori che non giocano piu nei 5 campionati del torneo.

I 5 campionati coperti: Premier League, LaLiga, Bundesliga, Serie A, Ligue 1.
Rimuove: trasferiti all'estero (Turchia/Arabia/Argentina/2.BL/Segunda/Championship),
giovani in squadre B/II (3. Liga / Primera Federacion), e team FotMob vuoto.
"""
import json, openpyxl

SRC = "/home/ubuntu/Downloads/euroleghe_master_classic_fotmob_2026_27_final_clean.xlsx"
AUDIT = "/tmp/euroleghe_audit_identita.json"

# nome listone -> motivo (verificato dall'audit / suggest FotMob)
DA_RIMUOVERE = {
    "Lukaku": "Fenerbahce (Süper Lig, Turchia)",
    "Djimsiti": "Al Diriyah (Saudi)",
    "Almada": "River Plate (Argentina)",
    "Aseko": "Hannover 96 (2. Bundesliga)",
    "Futkeu": "Elversberg (2. Bundesliga)",
    "Buonanotte": "Elche (Segunda)",
    "Fernandez Th.": "Levante (Segunda)",
    "Satpaev": "Burnley (Championship)",
    "Nartey": "VfB Stuttgart II (3. Liga)",
    "Arevalo": "VfB Stuttgart II (3. Liga)",
    "Diehl": "VfB Stuttgart II (3. Liga)",
    "Rincon H.": "Athletic Club B (Primera Federacion)",
    "Boiro": "team FotMob vuoto (non indicizzato)",
    "Rego": "team FotMob vuoto (non indicizzato)",
}

# sanity check: mostra il team FotMob attuale per ciascuno (dall'audit)
audit = {}
try:
    audit = json.load(open(AUDIT))
except Exception:
    pass

print("=== VERIFICA TEAM FOTMOB ATTUALE (dall'audit) ===")
for nome, motivo in DA_RIMUOVERE.items():
    a = audit.get(nome, {})
    team = a.get("team", "?")
    print(f"  {nome:18} -> FotMob team={team!r}  | motivo: {motivo}")

wb = openpyxl.load_workbook(SRC)
FOGLI = ["Solo_Torneo", "Portieri", "Difensori", "Centrocampisti", "Attaccanti"]
tot = 0
for sheet in FOGLI:
    ws = wb[sheet]
    h = [c.value for c in ws[1]]
    col = {v: i + 1 for i, v in enumerate(h) if v}
    gioc_col = col.get("giocatore")
    if not gioc_col:
        print(f"{sheet}: colonna giocatore non trovata, skip")
        continue
    da_elim = []
    for r in range(2, ws.max_row + 1):
        nome = ws.cell(r, gioc_col).value
        if nome in DA_RIMUOVERE:
            da_elim.append(r)
    for r in sorted(da_elim, reverse=True):
        ws.delete_rows(r)
    print(f"{sheet}: rimosse {len(da_elim)} righe")
    tot += len(da_elim)

wb.save(SRC)
print(f"TOTALE righe rimosse: {tot} (attesi {len(DA_RIMUOVERE)})")
print("salvato:", SRC)
