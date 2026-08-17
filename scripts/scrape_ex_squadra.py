#!/usr/bin/env python3
"""Scrape ex_squadra + lega_storico da FotMob playerData per tutti i giocatori."""
import json, urllib.request, time, openpyxl

SRC = "/home/ubuntu/Downloads/euroleghe_master_classic_fotmob_2026_27_final_clean.xlsx"
OUT = "/tmp/euroleghe_ex_squadra_v2.json"

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
        except Exception:
            if i == retries - 1:
                return None
            time.sleep(1.5 * (i + 1))

TARGET = "2026-06-30"

def to_date(v):
    if v is None or v == "":
        return ""
    if isinstance(v, (int, float)):
        try:
            from datetime import datetime, timezone
            ts = v / 1000 if v > 1e12 else v
            return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d")
        except Exception:
            return ""
    return str(v)[:10]

def find_team_2526(entries, primary_team):
    S_START = "2025-08-01"
    S_END = "2026-06-30"
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
    for t, _, _ in cands:
        tt = t.get("transferType") or {}
        if tt.get("localizationKey") == "on_loan":
            return t.get("team")
    from datetime import date
    def dur(c):
        return (date.fromisoformat(c[2]) - date.fromisoformat(c[1])).days
    cands.sort(key=dur, reverse=True)
    return cands[0][0].get("team")

wb = openpyxl.load_workbook(SRC, data_only=True)
ws = wb["Solo_Torneo"]
h = [c.value for c in ws[1]]
c = {v: i + 1 for i, v in enumerate(h) if v}

targets = []
for r in range(2, ws.max_row + 1):
    fid = ws.cell(r, c["fotmob_id"]).value
    if fid:
        targets.append((ws.cell(r, c["giocatore"]).value, int(fid)))

print(f"da scrapare: {len(targets)} giocatori", flush=True)

try:
    done = json.load(open(OUT))
except Exception:
    done = {}

start = time.time()
for i, (nome, fid) in enumerate(targets, 1):
    if nome in done:
        continue
    d = get(f"https://www.fotmob.com/api/data/playerData?id={fid}")
    if d is None:
        done[nome] = {"lega_storico": None, "ex_squadra": None}
    else:
        ml = d.get("mainLeague") or {}
        lega = ml.get("leagueName") or ml.get("name")
        pt = d.get("primaryTeam") or {}
        primary = pt.get("teamName")
        ch = d.get("careerHistory") or {}
        ci = ch.get("careerItems") or {}
        sen = ci.get("senior") or {}
        entries = sen.get("teamEntries") or []
        team2526 = find_team_2526(entries, primary)
        ex = team2526 if (team2526 and team2526 != primary) else None
        done[nome] = {"lega_storico": lega, "ex_squadra": ex}
    if i % 25 == 0 or i == len(targets):
        json.dump(done, open(OUT, "w"))
        print(f"{i}/{len(targets)}  ({time.time()-start:.0f}s)", flush=True)
    time.sleep(0.25)

json.dump(done, open(OUT, "w"))
print("FATTO:", len(done), "salvato in", OUT, flush=True)
