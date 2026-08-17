#!/usr/bin/env python3
"""Analizza l'audit identita e stampa i mismatch (squadra o nome non combaciano)."""
import json, unicodedata

OUT = "/tmp/euroleghe_audit_identita.json"
STOP = {"fc", "ac", "afc", "as", "cf", "club", "sporting", "tsg", "vfl", "vfb", "rb", "sc", "sv", "1", "real", "de", "la", "stade", "athletic", "ud", "ca", "rc", "cd", "sd", "ogc", "losc", "psg"}

def norm(s):
    if not s:
        return ""
    return unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode().lower()

def words(s):
    return {w for w in norm(s).replace("-", " ").replace(".", " ").split() if w and w not in STOP}

def cognome(nome):
    return norm(nome).split()[0] if nome else ""

def main():
    data = json.load(open(OUT))
    sospetti = []
    for nome, d in data.items():
        if d.get("error"):
            sospetti.append((nome, d.get("ruolo"), d.get("listone_squadra"), "ERROR_API", "", ""))
            continue
        ls = d.get("listone_squadra") or ""
        team = d.get("team") or ""
        fname = d.get("name") or ""
        # flag squadra: nessuna parola significativa in comune
        ws_ls, ws_tm = words(ls), words(team)
        flag_squadra = (not team) or (not (ws_ls & ws_tm))
        # flag nome: cognome listone non token/prefisso del nome fotmob
        cg = cognome(nome)
        toks = [w for w in norm(fname).replace("-", " ").split() if w]
        flag_nome = bool(cg) and not any(cg == t or (t.startswith(cg) and len(cg) / len(t) >= 0.5) for t in toks)
        if flag_squadra or flag_nome:
            sospetti.append((nome, d.get("ruolo"), ls, team, fname, d.get("pos")))
    print(f"SOSPETTI: {len(sospetti)}")
    for s in sospetti:
        print(" | ".join(str(x) for x in s))

if __name__ == "__main__":
    main()
