#!/usr/bin/env python3
"""Ispeziona mainLeague.stats per capire la chiave esatta delle presenze."""
import json, urllib.request

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
           "Referer": "https://www.fotmob.com/", "Accept": "application/json"}
fid = 169718  # Szczesny
req = urllib.request.Request(f"https://www.fotmob.com/api/data/playerData?id={fid}", headers=HEADERS)
d = json.load(urllib.request.urlopen(req, timeout=20))
ml = d.get("mainLeague") or {}
print("mainLeague keys:", list(ml.keys()))
st = ml.get("stats") or []
print(f"stats: {len(st)} voci")
for s in st:
    print("  ", s.get("localizedTitleId"), "=", s.get("value"))
