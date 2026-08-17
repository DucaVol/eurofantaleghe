#!/usr/bin/env python3
"""Cerca gli id FotMob corretti per i mismatch di identita via suggest endpoint."""
import json, urllib.request, urllib.parse, time

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
           "Referer": "https://www.fotmob.com/", "Accept": "application/json"}

# nome listone -> query di ricerca
QUERIES = {
    "Kim": "kim min jae",
    "Gabriel Magalhaes": "gabriel magalhaes",
    "Martinez Lis.": "lisandro martinez",
    "Alvarez Y.": "yeray alvarez",
    "Williams N.": "nico williams",
    "Williams I.": "inaki williams",
    "Adeyemi": "karim adeyemi",
    "Vivian": "dani vivian",
    "Berenguer": "alex berenguer",
    "Ederson D.S.": "ederson",
    "Garcia F.": "garcia francisco",
    "Navarro": "navarro",
    "Ramos G.": "ramos",
    "Cisse M.K.": "cisse",
    "Gila": "gila",
    "Ramon": "ramon",
    "Cresswell C.": "cresswell",
    "Joao Mario": "joao mario",
    "Chandler": "chandler",
    "Valdepenas": "valdepenas",
}

def get(url):
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        return {"error": str(e)}

for nome, q in QUERIES.items():
    term = urllib.parse.quote(q)
    d = get(f"https://apigw.fotmob.com/searchapi/suggest?term={term}&lang=en")
    cands = []
    for grp in ("squadMemberSuggest", "playerSuggest"):
        for opt in (d.get(grp) or {}).get("options", []) or []:
            p = opt.get("payload") or {}
            cands.append((p.get("id"), opt.get("text"), p.get("teamName")))
    print(f"\n### {nome}  (query: {q})")
    if isinstance(d, dict) and d.get("error"):
        print("  ERROR:", d["error"])
        continue
    if not cands:
        print("  NESSUN candidato")
        continue
    for cid, txt, team in cands[:8]:
        print(f"  {cid}  |  {txt}  |  {team}")
    time.sleep(0.4)
