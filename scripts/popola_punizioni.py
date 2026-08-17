#!/usr/bin/env python3
"""Popola tiri_punizione / tiri_da_corner / crosses nel Solo_Torneo (e fogli ruolo) dai dati scrapati."""
import json, openpyxl

SRC = "/home/ubuntu/Downloads/euroleghe_master_classic_fotmob_2026_27_final_clean.xlsx"
DATA = "/tmp/euroleghe_punizioni.json"

data = json.load(open(DATA))


def norm(v):
    if v is None or v == "":
        return None
    try:
        return int(float(str(v).replace(",", ".")))
    except (ValueError, TypeError):
        return None


wb = openpyxl.load_workbook(SRC)
for sheet in ["Solo_Torneo", "Difensori", "Centrocampisti", "Attaccanti"]:
    ws = wb[sheet]
    hdr = [c.value for c in ws[1]]
    col = {v: i + 1 for i, v in enumerate(hdr) if v}
    if "tiri_punizione" not in col:
        base = len(hdr) + 1
        for j, k in enumerate(["tiri_punizione", "tiri_da_corner", "crosses"]):
            ws.cell(1, base + j, k)
            col[k] = base + j
    found = 0
    for r in range(2, ws.max_row + 1):
        if ws.cell(r, col["ruolo"]).value not in ("D", "C", "A"):
            continue
        nome = ws.cell(r, col["giocatore"]).value
        if nome in data:
            d = data[nome]
            ws.cell(r, col["tiri_punizione"], norm(d.get("tiri_punizione")))
            ws.cell(r, col["tiri_da_corner"], norm(d.get("tiri_da_corner")))
            ws.cell(r, col["crosses"], norm(d.get("crosses")))
            found += 1
    print(f"{sheet}: popolati {found} giocatori")

wb.save(SRC)
print("salvato:", SRC)
