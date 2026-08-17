#!/usr/bin/env python3
"""Popola ex_squadra + lega_storico nel Solo_Torneo (e fogli ruolo) dai dati scrapati."""
import json, openpyxl

SRC = "/home/ubuntu/Downloads/euroleghe_master_classic_fotmob_2026_27_final_clean.xlsx"
DATA = "/tmp/euroleghe_ex_squadra_v3.json"

data = json.load(open(DATA))

# campionato listone -> campionato FotMob (per confronto cambio campionato)
LISTONE_FOTMOB = {
    "Liga": "LaLiga",
    "Premier League": "Premier League",
    "Bundesliga": "Bundesliga",
    "Serie A": "Serie A",
    "Ligue 1": "Ligue 1",
}

wb = openpyxl.load_workbook(SRC)
for sheet in ["Solo_Torneo", "Portieri", "Difensori", "Centrocampisti", "Attaccanti"]:
    ws = wb[sheet]
    hdr = [c.value for c in ws[1]]
    c = {v: i + 1 for i, v in enumerate(hdr) if v}
    if "ex_squadra" not in c:
        base = len(hdr) + 1
        ws.cell(1, base, "ex_squadra")
        ws.cell(1, base + 1, "lega_storico")
        c["ex_squadra"] = base
        c["lega_storico"] = base + 1
    found = 0
    for r in range(2, ws.max_row + 1):
        if ws.cell(r, c["ruolo"]).value not in ("P", "D", "C", "A"):
            continue
        nome = ws.cell(r, c["giocatore"]).value
        camp = ws.cell(r, c["campionato"]).value
        if nome not in data:
            continue
        d = data[nome]
        ex = d.get("ex_squadra")
        lega = d.get("lega_storico")
        # lega_storico solo se diversa dal campionato attuale (mappato)
        camp_fotmob = LISTONE_FOTMOB.get(camp, camp)
        lega_final = lega if (lega and lega != camp_fotmob) else None
        ws.cell(r, c["ex_squadra"]).value = ex
        ws.cell(r, c["lega_storico"]).value = lega_final
        if ex or lega_final:
            found += 1
    print(f"{sheet}: popolati {found} con ex_squadra o lega_storico")

wb.save(SRC)
print("salvato:", SRC)
