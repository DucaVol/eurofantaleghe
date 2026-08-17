#!/usr/bin/env python3
"""Verifica accuratezza dati: campione random di giocatori vs FotMob (stats) e vs quotazioni ufficiali EuroLeghe."""
import json, random, urllib.request, time, openpyxl

MASTER = "/home/ubuntu/Downloads/euroleghe_master_classic_fotmob_2026_27_final_clean.xlsx"
QUOT = "/home/ubuntu/Downloads/Quotazioni_Fantacalcio_EuroLeghe_Stagione_2026_27.xlsx"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
           "Referer": "https://www.fotmob.com/", "Accept": "application/json"}

# ---- carica quotazioni ufficiali ----
wbq = openpyxl.load_workbook(QUOT, data_only=True)
wsq = wbq["Tutti"]
hq = [c.value for c in wsq[2]]
cq = {v: i + 1 for i, v in enumerate(hq) if v}
quot_uff = {}
for r in range(3, wsq.max_row + 1):
    idv = wsq.cell(r, cq["Id"]).value
    if idv is None:
        continue
    quot_uff[int(idv)] = {
        "Qt.A": wsq.cell(r, cq["Qt.A"]).value,
        "Qt.I": wsq.cell(r, cq["Qt.I"]).value,
        "FVM": wsq.cell(r, cq["FVM"]).value,
    }

# ---- carica master ----
wb = openpyxl.load_workbook(MASTER, data_only=True)
ws = wb["Solo_Torneo"]
h = [c.value for c in ws[1]]
c = {v: i + 1 for i, v in enumerate(h) if v}
players = []
for r in range(2, ws.max_row + 1):
    ruolo = ws.cell(r, c["ruolo"]).value
    if ruolo not in ("P", "D", "C", "A"):
        continue
    players.append({
        "id": ws.cell(r, c["id_fantacalcio"]).value,
        "nome": ws.cell(r, c["giocatore"]).value,
        "ruolo": ruolo,
        "sq": ws.cell(r, c["squadra_fantacalcio"]).value,
        "fotmob_id": ws.cell(r, c["fotmob_id"]).value,
        "quot": ws.cell(r, c["quotazione"]).value,
        "quot_i": ws.cell(r, c["quotazione_iniziale"]).value,
        "fvm": ws.cell(r, c["fvm"]).value,
        "pres": ws.cell(r, c["presenze_campionato"]).value,
        "min": ws.cell(r, c["minuti_campionato"]).value,
        "gol": ws.cell(r, c["gol_campionato"]).value,
        "ass": ws.cell(r, c["assist_campionato"]).value,
        "rating": ws.cell(r, c["rating_fotmob"]).value,
    })

# ---- campione stratificato random ----
random.seed(42)
per_ruolo = {r: [p for p in players if p["ruolo"] == r] for r in ("P", "D", "C", "A")}
campione = []
for ruolo, n in (("P", 3), ("D", 6), ("C", 6), ("A", 5)):
    campione += random.sample(per_ruolo[ruolo], min(n, len(per_ruolo[ruolo])))
print(f"Totale giocatori master: {len(players)} | campione: {len(campione)}\n")


def num(v):
    if v is None or v == "":
        return None
    try:
        return float(v)
    except Exception:
        return None


def stat_val(stats, key):
    for s in stats or []:
        if s.get("localizedTitleId") == key:
            return s.get("value")
    return None


def eq(a, b, tol=0.011):
    if a is None and b is None:
        return True
    if a is None or b is None:
        return False
    return abs(float(a) - float(b)) <= tol


def scrape_fotmob(fid):
    if not fid:
        return None
    req = urllib.request.Request(f"https://www.fotmob.com/api/data/playerData?id={fid}", headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            d = json.loads(resp.read().decode())
    except Exception as e:
        return {"error": str(e)}
    ml = d.get("mainLeague") or {}
    st = ml.get("stats") or []
    return {
        "pres": num(stat_val(st, "matches_uppercase")),  # typo FotMob, non "appearances"
        "min": num(stat_val(st, "minutes_played")),
        "gol": num(stat_val(st, "goals")),
        "ass": num(stat_val(st, "assists")),
        "rating": num(stat_val(st, "rating")),
    }


n_quot_ko = 0
n_stats_ko = 0
n_fotmob_err = 0
n_quot_missing = 0
print("=" * 78)
for i, p in enumerate(campione, 1):
    idv = p["id"]
    uff = quot_uff.get(int(idv)) if idv is not None else None
    # quotazioni
    if uff is None:
        qmsg = f"QUOTAZIONE NON TROVATA in file ufficiale (id={idv})"
        n_quot_missing += 1
        q_ok = False
    else:
        ok_qa = eq(p["quot"], uff["Qt.A"])
        ok_qi = eq(p["quot_i"], uff["Qt.I"])
        ok_fvm = eq(p["fvm"], uff["FVM"])
        q_ok = ok_qa and ok_qi and ok_fvm
        qmsg = (f"Qt.A {p['quot']} vs {uff['Qt.A']} {'OK' if ok_qa else '**DIFF**'} | "
                f"Qt.I {p['quot_i']} vs {uff['Qt.I']} {'OK' if ok_qi else '**DIFF**'} | "
                f"FVM {p['fvm']} vs {uff['FVM']} {'OK' if ok_fvm else '**DIFF**'}")
    if not q_ok:
        n_quot_ko += 1
    # fotmob
    f = scrape_fotmob(p["fotmob_id"])
    time.sleep(0.3)
    if f is None or "error" in f:
        smsg = f"FOTMOB ERRORE: {f.get('error') if f else 'nessun id'}"
        n_fotmob_err += 1
        s_ok = False
    else:
        ok_g = eq(p["gol"], f["gol"], 0.5)
        ok_a = eq(p["ass"], f["ass"], 0.5)
        ok_r = eq(p["rating"], f["rating"], 0.011)
        ok_p = eq(p["pres"], f["pres"], 0.5)
        ok_m = eq(p["min"], f["min"], 1.0)
        s_ok = ok_g and ok_a and ok_r and ok_p and ok_m
        smsg = (f"gol {p['gol']} vs {f['gol']} {'OK' if ok_g else '**DIFF**'} | "
                f"ass {p['ass']} vs {f['ass']} {'OK' if ok_a else '**DIFF**'} | "
                f"rat {p['rating']} vs {f['rating']} {'OK' if ok_r else '**DIFF**'} | "
                f"pres {p['pres']} vs {f['pres']} {'OK' if ok_p else '**DIFF**'} | "
                f"min {p['min']} vs {f['min']} {'OK' if ok_m else '**DIFF**'}")
    if not s_ok:
        n_stats_ko += 1
    print(f"{i:2}. {p['nome']} ({p['ruolo']}, {p['sq']}) id={idv} fotmob={p['fotmob_id']}")
    print(f"    QUOT: {qmsg}")
    print(f"    STAT: {smsg}")

print("=" * 78)
print(f"\nRISULTATO: {len(campione)} verificati")
print(f"  quotazioni con discrepanze: {n_quot_ko}")
print(f"  quotazioni mancanti (id non nel file): {n_quot_missing}")
print(f"  stats FotMob con discrepanze: {n_stats_ko}")
print(f"  errori scrape FotMob: {n_fotmob_err}")
