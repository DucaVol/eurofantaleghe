#!/usr/bin/env python3
"""Corregge i fotmob_id sbagliati (mismatch nomi) e ri-scrapa le stats corrette."""
import json, urllib.request, time, openpyxl
from datetime import datetime, timezone

SRC = "/home/ubuntu/Downloads/euroleghe_master_classic_fotmob_2026_27_final_clean.xlsx"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": "https://www.fotmob.com/",
    "Accept": "application/json",
}

# nome listone -> fotmob_id corretto (None = non trovato, azzera)
FIX = {
    "Kim": 828159,                # Min-Jae Kim (Bayern) - era Joshua Kimmich
    "Gabriel Magalhaes": 795179,  # Gabriel (Arsenal) - era João Gabriel (Mixto)
    "Martinez Lis.": 847983,      # Lisandro Martínez (Man United) - era Jorge Martínez-Losa
    "Alvarez Y.": 639450,         # Yeray Álvarez (Athletic) - era Julián Álvarez
    "Williams N.": 1202110,       # Nico Williams (Athletic) - era Mekeil Williams
    "Williams I.": 604105,        # Iñaki Williams (Athletic) - era Mekeil Williams
    "Adeyemi": 959594,            # Karim Adeyemi (Barcelona) - era Tom Adeyemi
    "Vivian": 940743,             # Daniel Vivian (Athletic) - era Vivian Montenegro
    "Berenguer": 574629,          # Alex Berenguer (Athletic) - era Aina Fernandez Berenguer
    "Ederson D.S.": 957203,       # Éderson (Atalanta) - era Ederson Tormena
    "Garcia F.": 750028,          # Fran García (Real Betis) - era Gonzalo García (Fulham)
    "Navarro": 1011117,           # Robert Navarro (Athletic) - era Pau Navarro (Villarreal)
    "Ramos G.": 940087,           # Gonçalo Ramos (Milan) - era Sergio Ramos
    "Cissè M.K.": 1714552,        # Modou Kéba Cissé (Aston Villa) - era Cissé Mory (Liepaja)
    "Gila": 1106074,              # Mario Gila (Milan) - era Eloy Gila
    "Cresswell C.": 1186444,      # Charlie Cresswell (Rennes) - era Cameron Cresswell
    "Joao Mario": 958421,         # João Mário (Fiorentina) - era João Mário (svincolato)
    "Chandler": 158234,           # Timothy Chandler (Eintracht) - era Jamie Chandler
    "Ramon": None,                # difensore Como - id non trovato, azzera
    "Valdepenas": None,           # difensore Fiorentina - id non trovato, azzera
}

def get(url, retries=3):
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            return json.load(urllib.request.urlopen(req, timeout=25))
        except Exception:
            if i == retries - 1:
                return None
            time.sleep(1.5 * (i + 1))

def stat_val(stats, key):
    for s in stats or []:
        if s.get("localizedTitleId") == key:
            return s.get("value")
    return None

def adv(fss, lid):
    for grp in ((fss or {}).get("statsSection") or {}).get("items", []) or []:
        for s in grp.get("items", []) or []:
            if s.get("localizedTitleId") == lid:
                return s.get("statValue")
    return None

def num(v):
    if v is None or v == "":
        return None
    try:
        return float(v)
    except Exception:
        return None

def to_date(v):
    if v is None or v == "":
        return ""
    if isinstance(v, (int, float)):
        try:
            ts = v / 1000 if v > 1e12 else v
            return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d")
        except Exception:
            return ""
    return str(v)[:10]

def find_team_2526(entries, primary_team):
    S_START = "2025-08-01"
    S_END = "2026-06-30"
    from datetime import date
    cands = []
    for t in entries or []:
        if t.get("active"):
            continue
        team = (t.get("team") or "").strip()
        if team.lower() == (primary_team or "").strip().lower():
            continue
        start = to_date(t.get("startDate"))
        end = to_date(t.get("endDate")) or "9999-12-31"
        if start and start <= S_END and end >= S_START:
            ov_s = max(start, S_START)
            ov_e = min(end, S_END)
            cands.append((t, ov_s, ov_e))
    if not cands:
        return None
    cands = [c for c in cands if (date.fromisoformat(c[2]) - date.fromisoformat(c[1])).days >= 90]
    if not cands:
        return None
    for t, _, _ in cands:
        if (t.get("transferType") or {}).get("localizationKey") == "on_loan":
            return t.get("team")
    cands.sort(key=lambda c: (date.fromisoformat(c[2]) - date.fromisoformat(c[1])).days, reverse=True)
    return cands[0][0].get("team")

def scrape_player(fid):
    """Restituisce un dict con tutti i campi FotMob per il giocatore (o None se non trovato)."""
    if fid is None:
        return None
    d = get(f"https://www.fotmob.com/api/data/playerData?id={fid}")
    if d is None:
        return None
    ml = d.get("mainLeague") or {}
    ml_stats = ml.get("stats") or []
    fss = d.get("firstSeasonStats") or {}
    sm = fss.get("shotmap") or []

    presenze = num(stat_val(ml_stats, "matches_uppercase"))  # typo FotMob, NON "appearances"
    minuti = num(stat_val(ml_stats, "minutes_played"))

    pos = d.get("positionDescription") or {}
    prim = pos.get("primaryPosition") or {}
    ruolo_reale = prim.get("label")

    pt = d.get("primaryTeam") or {}
    primary = pt.get("teamName")

    ch = d.get("careerHistory") or {}
    entries = (((ch.get("careerItems") or {}).get("senior")) or {}).get("teamEntries") or []

    # rigori parati: formato "parati/affrontati"
    rp_raw = adv(fss, "saved_penalties") or adv(fss, "penalty_saves")
    rigori_parati = None
    if rp_raw:
        try:
            rigori_parati = int(str(rp_raw).split("/")[0])
        except Exception:
            rigori_parati = None

    xg = num(adv(fss, "expected_goals"))
    xgnp = num(adv(fss, "non_penalty_xg"))

    # rigori segnati: dal shotmap (situation Penalty e isOnTarget?)
    rigori_gol = sum(1 for s in sm if s.get("situation") == "Penalty" and s.get("isGoal"))

    return {
        "fotmob_id": fid,
        "ruolo_reale": ruolo_reale,
        "rating": num(stat_val(ml_stats, "rating")),
        "presenze": int(presenze) if presenze is not None else None,
        "minuti": int(minuti) if minuti is not None else None,
        "gol": num(stat_val(ml_stats, "goals")),
        "assist": num(stat_val(ml_stats, "assists")),
        "gialli": num(stat_val(ml_stats, "yellow_cards")),
        "rossi": num(stat_val(ml_stats, "red_cards")),
        "xG": xg,
        "xA": num(adv(fss, "expected_assists")),
        "tiri": num(adv(fss, "shots")),
        "tiri_in_porta": num(adv(fss, "ShotsOnTarget")),
        "xG_no_rigori": xgnp,
        "rigori_gol": rigori_gol,
        "occasioni_create": num(adv(fss, "chances_created")),
        "big_chances": num(adv(fss, "big_chance_created_team_title")),
        "tocchi_area": num(adv(fss, "touches_opp_box")),
        "tiri_punizione": sum(1 for s in sm if s.get("situation") == "FreeKick"),
        "tiri_da_corner": sum(1 for s in sm if s.get("situation") == "FromCorner"),
        "crosses": num(adv(fss, "crosses_succeeeded")),
        "clean_sheet": num(adv(fss, "clean_sheet_team_title")),
        "gol_subiti": num(adv(fss, "goals_conceded")),
        "rigori_parati": rigori_parati,
        "ex_squadra": find_team_2526(entries, primary),
        "lega_storico": ml.get("leagueName"),
    }

# campo file Excel -> chiave scrape
COLMAP = {
    "fotmob_id": "fotmob_id",
    "rating_fotmob": "rating",
    "presenze_campionato": "presenze",
    "minuti_campionato": "minuti",
    "gol_campionato": "gol",
    "assist_campionato": "assist",
    "gialli": "gialli",
    "rossi": "rossi",
    "xG": "xG",
    "xA": "xA",
    "tiri": "tiri",
    "tiri_in_porta": "tiri_in_porta",
    "xG_no_rigori": "xG_no_rigori",
    "rigori_gol": "rigori_gol",
    "occasioni_create": "occasioni_create",
    "big_chances_create": "big_chances",
    "tocchi_area": "tocchi_area",
    "tiri_punizione": "tiri_punizione",
    "tiri_da_corner": "tiri_da_corner",
    "crosses": "crosses",
    "clean_sheet": "clean_sheet",
    "gol_subiti": "gol_subiti",
    "rigori_parati": "rigori_parati",
    "ex_squadra": "ex_squadra",
    "lega_storico": "lega_storico",
    "ruolo_reale_principale": "ruolo_reale",
}

wb = openpyxl.load_workbook(SRC)
for sheet in ["Solo_Torneo", "Portieri", "Difensori", "Centrocampisti", "Attaccanti"]:
    ws = wb[sheet]
    h = [c.value for c in ws[1]]
    col = {v: i + 1 for i, v in enumerate(h) if v}
    gioc_col = col.get("giocatore")
    if not gioc_col:
        continue
    for r in range(2, ws.max_row + 1):
        nome = ws.cell(r, gioc_col).value
        if nome not in FIX:
            continue
        new_id = FIX[nome]
        data = scrape_player(new_id) if new_id else {}
        if data and data.get("lega_storico"):
            camp = ws.cell(r, col.get("campionato")).value if col.get("campionato") else None
            CAMPMAP = {"Liga": "LaLiga", "Premier League": "Premier League", "Bundesliga": "Bundesliga", "Serie A": "Serie A", "Ligue 1": "Ligue 1"}
            if data["lega_storico"] == CAMPMAP.get(camp, camp):
                data["lega_storico"] = None
        for fcol, skey in COLMAP.items():
            if fcol not in col:
                continue
            val = data.get(skey) if data else None
            ws.cell(r, col[fcol]).value = val
        # titolarita_pct ricalcolata
        if data and data.get("minuti") and data.get("presenze"):
            mp = data["minuti"] / data["presenze"]
            tp = min(100.0, round(mp / 90.0 * 100, 1))
            if "titolarita_pct" in col:
                ws.cell(r, col["titolarita_pct"]).value = tp
        print(f"  {nome}: id {new_id} -> {data.get('ruolo_reale') if data else 'NULL'} | gol={data.get('gol') if data else None} assist={data.get('assist') if data else None}")

wb.save(SRC)
print("salvato:", SRC)
