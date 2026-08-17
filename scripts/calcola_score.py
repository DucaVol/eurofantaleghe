#!/usr/bin/env python3
"""Calcola score_finale (0-100) per ruolo e popola la colonna nel Solo_Torneo."""
import openpyxl

SRC = "/home/ubuntu/Downloads/euroleghe_master_classic_fotmob_2026_27_final_clean.xlsx"

# giornate per campionato (per calcolare la titolarita sui minuti totali)
PARTITE = {"Liga": 38, "Premier League": 38, "Serie A": 38, "Bundesliga": 34, "Ligue 1": 34}


def n(v):
    if v is None or v == "":
        return 0.0
    try:
        return float(str(v).replace(",", "."))
    except (ValueError, TypeError):
        return 0.0


def clamp(x, lo=0, hi=100):
    return max(lo, min(hi, x))


wb = openpyxl.load_workbook(SRC)
for sheet in ["Solo_Torneo", "Portieri", "Difensori", "Centrocampisti", "Attaccanti"]:
    ws = wb[sheet]
    hdr = [c.value for c in ws[1]]
    c = {v: i + 1 for i, v in enumerate(hdr) if v}
    if "score_finale" not in c:
        continue
    done = 0
    for r in range(2, ws.max_row + 1):
        ruolo = ws.cell(r, c["ruolo"]).value
        # titolarita = minuti totali / (partite campionato * 90), 0..1
        minuti = n(ws.cell(r, c["minuti_campionato"]).value)
        camp = ws.cell(r, c["campionato"]).value
        partite = PARTITE.get(camp, 38)
        tit = min(1.0, minuti / (partite * 90)) if minuti else 0.0
        if "titolarita_pct" in c:
            ws.cell(r, c["titolarita_pct"]).value = round(tit * 100, 1)
        rating = n(ws.cell(r, c["rating_fotmob"]).value)
        gol = n(ws.cell(r, c["gol_campionato"]).value)
        ass = n(ws.cell(r, c["assist_campionato"]).value)
        xg = n(ws.cell(r, c["xG"]).value)
        xa = n(ws.cell(r, c["xA"]).value)
        gialli = n(ws.cell(r, c["gialli"]).value)
        rossi = n(ws.cell(r, c["rossi"]).value)
        base = n(ws.cell(r, c["prezzo_base_ceil"]).value)
        cs = n(ws.cell(r, c["clean_sheet"]).value) if "clean_sheet" in c else 0
        rp = n(ws.cell(r, c["rigori_parati"]).value) if "rigori_parati" in c else 0
        rr = (ws.cell(r, c["ruolo_reale_principale"]).value or "").lower()

        # titolarità: 0..40
        score = clamp(tit, 0, 1) * 40
        # rating: 6.0..7.5 -> 0..25
        score += clamp((rating - 6.0) / 1.5, 0, 1) * 25
        # valore: prezzo basso premia (base 1..15 -> 15..0)
        score += clamp(15 - base, 0, 15)

        if ruolo == "P":
            score += clamp(cs * 0.7, 0, 15)
            score += clamp(rp * 2, 0, 5)
        elif ruolo == "D":
            score += clamp((gol + ass) * 1.2, 0, 15)
            score += clamp(xa * 0.5, 0, 5)
        elif ruolo == "C":
            score += clamp((gol + ass) * 1.2, 0, 12)
            score += clamp(xg * 0.4, 0, 6)
            # ruolo reale offensivo per i C vale oro
            if any(k in rr for k in ("attacking", "winger", "forward", "striker", "left mid", "right mid", "am")):
                score += 5
        elif ruolo == "A":
            score += clamp(gol * 1.4, 0, 15)
            score += clamp(xg * 0.4, 0, 8)

        # rischio carte
        score -= clamp(gialli * 0.5 + rossi * 3, 0, 12)

        ws.cell(r, c["score_finale"], round(clamp(score), 0))
        done += 1
    print(f"{sheet}: score calcolato per {done} giocatori")

wb.save(SRC)
print("salvato:", SRC)
