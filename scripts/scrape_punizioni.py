#!/usr/bin/env python3
"""Scrape punizioni/corner/crosses da FotMob API per i D/C/A del listone."""
import json, urllib.request, time, sys, openpyxl

SRC = "/home/ubuntu/Downloads/euroleghe_master_classic_fotmob_2026_27_final_clean.xlsx"
OUT = "/tmp/euroleghe_punizioni.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": "https://www.fotmob.com/",
    "Accept": "application/json",
}

def get(url, retries=3):
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            return json.load(urllib.request.urlopen(req, timeout=25))
        except Exception as e:
            if i == retries - 1:
                return None
            time.sleep(1.5 * (i + 1))

def adv(fss, lid):
    for grp in ((fss or {}).get("statsSection") or {}).get("items", []) or []:
        for s in grp.get("items", []) or []:
            if s.get("localizedTitleId") == lid:
                return s.get("statValue")
    return None

def scrape(fotmob_id):
    d = get(f"https://www.fotmob.com/api/data/playerData?id={fotmob_id}")
    if d is None:
        return None
    fss = d.get("firstSeasonStats") or {}
    sm = fss.get("shotmap") or []
    return {
        "tiri_punizione": sum(1 for s in sm if s.get("situation") == "FreeKick"),
        "tiri_da_corner": sum(1 for s in sm if s.get("situation") == "FromCorner"),
        "crosses": adv(fss, "crosses_succeeeded"),
    }

# carica giocatori D/C/A con fotmob_id
wb = openpyxl.load_workbook(SRC, data_only=True)
ws = wb["Solo_Torneo"]
h = [c.value for c in ws[1]]
c = {v: i + 1 for i, v in enumerate(h) if v}
targets = []
for r in range(2, ws.max_row + 1):
    ruolo = ws.cell(r, c["ruolo"]).value
    fid = ws.cell(r, c["fotmob_id"]).value
    if ruolo in ("D", "C", "A") and fid:
        targets.append((ws.cell(r, c["giocatore"]).value, int(fid)))

print(f"da scrapare: {len(targets)} giocatori D/C/A", flush=True)

# checkpoint
try:
    done = json.load(open(OUT))
except Exception:
    done = {}

start = time.time()
for i, (nome, fid) in enumerate(targets, 1):
    if nome in done:
        continue
    res = scrape(fid)
    if res is None:
        res = {"tiri_punizione": None, "tiri_da_corner": None, "crosses": None}
    done[nome] = res
    if i % 25 == 0 or i == len(targets):
        json.dump(done, open(OUT, "w"))
        el = time.time() - start
        print(f"{i}/{len(targets)}  ({el:.0f}s)", flush=True)
    time.sleep(0.25)

json.dump(done, open(OUT, "w"))
print("FATTO. totale:", len(done), "salvato in", OUT, flush=True)
