#!/usr/bin/env python3
"""Audit identita: scrapa nome+squadra+posizione FotMob per tutti e flagga i mismatch."""
import json, urllib.request, time, unicodedata, openpyxl

SRC = "/home/ubuntu/Downloads/euroleghe_master_classic_fotmob_2026_27_final_clean.xlsx"
OUT = "/tmp/euroleghe_audit_identita.json"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Referer": "https://www.fotmob.com/", "Accept": "application/json"}

STOP = {"fc", "ac", "afc", "as", "cf", "club", "sporting", "tsg", "vfl", "vfb", "rb", "sc", "sv", "1", "real", "de", "la", "stade", "athletic", "ud", "ca", "rc", "cd", "sd", "ogc", "losc", "psg"}

def norm(s):
    if not s:
        return ""
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode().lower()
    return s

def words(s):
    return {w for w in norm(s).replace("-", " ").replace(".", " ").split() if w and w not in STOP}

def get(url):
    r = urllib.request.Request(url, headers=HEADERS)
    for _ in range(3):
        try:
            with urllib.request.urlopen(r, timeout=20) as resp:
                return json.loads(resp.read().decode())
        except Exception:
            time.sleep(1.5)
    return None

def scrape(pid):
    d = get(f"https://www.fotmob.com/api/data/playerData?id={pid}")
    if not d:
        return None
    pt = d.get("primaryTeam") or {}
    name = d.get("name") or ""
    return {
        "name": name,
        "team": pt.get("teamName") or "",
        "pos": (d.get("primaryPosition") or {}).get("label") if isinstance(d.get("primaryPosition"), dict) else None,
    }

def main():
    wb = openpyxl.load_workbook(SRC, data_only=True)
    ws = wb["Solo_Torneo"]
    h = [c.value for c in ws[1]]
    c = {v: i + 1 for i, v in enumerate(h) if v}
    players = []
    for r in range(2, ws.max_row + 1):
        ruolo = ws.cell(r, c["ruolo"]).value
        if ruolo not in ("P", "D", "C", "A"):
            continue
        nome = ws.cell(r, c["giocatore"]).value
        squadra = ws.cell(r, c["squadra_fantacalcio"]).value
        pid = ws.cell(r, c["fotmob_id"]).value
        if nome and pid:
            players.append((r, nome, squadra, ruolo, pid))
    print(f"da auditare: {len(players)}")
    done = {}
    if __import__("os").path.exists(OUT):
        done = json.load(open(OUT))
    res = dict(done)
    for i, (r, nome, squadra, ruolo, pid) in enumerate(players):
        if nome in res:
            continue
        d = scrape(pid)
        if d is None:
            res[nome] = {"error": True, "listone_squadra": squadra, "ruolo": ruolo}
        else:
            res[nome] = {**d, "listone_squadra": squadra, "ruolo": ruolo}
        if (i + 1) % 50 == 0:
            json.dump(res, open(OUT, "w"))
            print(f"{i+1}/{len(players)}", flush=True)
    json.dump(res, open(OUT, "w"))
    print(f"FATTO: {len(res)}")

if __name__ == "__main__":
    main()
