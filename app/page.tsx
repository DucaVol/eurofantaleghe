"use client";

import { useEffect, useMemo, useState } from "react";
import Buste from "./components/Buste";
import { BUDGET, ROSA, ROSA_TOT, type Esito, type Offerta } from "./types";

type Player = {
  id: number | string;
  ruolo: string;
  nome: string;
  squadra: string;
  campionato: string | null;
  quotazione: number | null;
  base: number | null;
  fvm: number | null;
  eta: number | null;
  nazionalita: string | null;
  ruolo_reale: string | null;
  presenze: number | null;
  minuti: number | null;
  titolarita_pct: number | null;
  gol: number | null;
  assist: number | null;
  rating: number | null;
  gialli: number | null;
  rossi: number | null;
  xG: number | null;
  xA: number | null;
  tiri: number | null;
  tiri_in_porta: number | null;
  rigori_gol: number | null;
  xG_no_rigori: number | null;
  occasioni_create: number | null;
  big_chances: number | null;
  tocchi_area: number | null;
  clean_sheet: number | null;
  gol_subiti: number | null;
  rigori_parati: number | null;
  injury_status: string | null;
  score_finale: number | null;
  categoria: string | null;
  max_bid: number | null;
  offerta: number | null;
  fotmob_id: number | null;
};

type Col = {
  key: keyof Player | "nome" | "squadra";
  label: string;
  desc?: string;
  num?: boolean;
  dec?: number;
  pct?: boolean;
  per90?: boolean;
  showFor?: string[];
};

const RUOLI = [
  { key: "P", label: "Portieri" },
  { key: "D", label: "Difensori" },
  { key: "C", label: "Centrocampisti" },
  { key: "A", label: "Attaccanti" },
];

const ROLE_LABEL: Record<string, string> = {
  P: "Portieri",
  D: "Difensori",
  C: "Centrocampisti",
  A: "Attaccanti",
};

const COLUMNS: Col[] = [
  { key: "nome", label: "Giocatore", desc: "Nome nel listone EuroLeghe 2026/27" },
  { key: "squadra", label: "Squadra", desc: "Squadra di appartenenza nel listone" },
  { key: "quotazione", label: "Quot.", num: true, dec: 0, desc: "Quotazione ufficiale" },
  { key: "base", label: "½ Quot.", num: true, dec: 0, desc: "Metà quotazione (ceil) — riferimento per il mercato inoltrato; in busta si parte da 1" },
  { key: "fvm", label: "FVM", num: true, dec: 0, desc: "Fanta Valore di Mercato" },
  { key: "rating", label: "MV", num: true, dec: 2, desc: "Media voto FotMob 2025/26 (NON è il fantavoto)" },
  { key: "eta", label: "Età", num: true, dec: 0, desc: "Età del giocatore" },
  { key: "ruolo_reale", label: "Pos.", desc: "Posizione reale secondo FotMob (può differire dal ruolo listone)" },
  { key: "presenze", label: "Pres.", num: true, dec: 0, desc: "Presenze 2025/26" },
  { key: "minuti", label: "Min.", num: true, dec: 0, desc: "Minuti giocati 2025/26" },
  { key: "titolarita_pct", label: "Min. giocati", num: true, per90: true, desc: "Minuti in media a partita (90' = sempre in campo)" },
  { key: "gol", label: "Gol", num: true, dec: 0, showFor: ["D", "C", "A"], desc: "Gol segnati 2025/26" },
  { key: "assist", label: "Assist", num: true, dec: 0, showFor: ["P", "D", "C", "A"], desc: "Assist 2025/26" },
  { key: "xG", label: "xG", num: true, dec: 1, showFor: ["D", "C", "A"], desc: "Expected Goals: gol attesi dalla qualità dei tiri" },
  { key: "xA", label: "xA", num: true, dec: 1, showFor: ["P", "D", "C", "A"], desc: "Expected Assists" },
  { key: "tiri", label: "Tiri", num: true, dec: 0, showFor: ["C", "A"], desc: "Tiri totali 2025/26" },
  { key: "tiri_in_porta", label: "In porta", num: true, dec: 0, showFor: ["D", "A"], desc: "Tiri nello specchio" },
  { key: "rigori_gol", label: "Rig.", num: true, dec: 0, showFor: ["D", "C", "A"], desc: "Rigori segnati (segnale di chi tira i rigori)" },
  { key: "occasioni_create", label: "Occ. create", num: true, dec: 0, showFor: ["C"], desc: "Occasioni da gol create" },
  { key: "big_chances", label: "Big chance", num: true, dec: 0, showFor: ["C", "A"], desc: "Grandi occasioni create" },
  { key: "tocchi_area", label: "Tocchi area", num: true, dec: 0, showFor: ["D", "C", "A"], desc: "Tocchi in area avversaria" },
  { key: "clean_sheet", label: "Clean sheet", num: true, dec: 0, showFor: ["P"], desc: "Porte inviolate nella 2025/26 (bonus imbattibilità +1)" },
  { key: "rigori_parati", label: "Parati", num: true, dec: 0, showFor: ["P"], desc: "Rigori parati nella 2025/26 (bonus +3 ciascuno)" },
  { key: "gol_subiti", label: "Subiti", num: true, dec: 0, showFor: ["P"], desc: "Gol subiti nella 2025/26 (meno sono, meglio è)" },
  { key: "gialli", label: "Gialli", num: true, dec: 0, desc: "Ammonizioni (malus)" },
  { key: "rossi", label: "Rossi", num: true, dec: 0, desc: "Espulsioni (malus)" },
  { key: "score_finale", label: "Score", num: true, dec: 0, desc: "Score finale calcolato (continuità + bonus + valore + rischio)" },
  { key: "max_bid", label: "Max bid", num: true, dec: 0, desc: "Offerta massima suggerita dal piano" },
];

function cellValue(p: Player, key: string): string | number | null {
  return (p as Record<string, unknown>)[key] as string | number | null;
}

function fmt(p: Player, c: Col): string {
  const v = cellValue(p, c.key);
  if (v === null || v === undefined || v === "") return "–";
  if (c.pct) return Math.round(Number(v) * 100) + "%";
  if (c.per90) return Math.round(Number(v) * 90) + "'";
  if (c.num) return Number(v).toFixed(c.dec ?? 0);
  return String(v);
}

const COLOR_DIR: Record<string, "asc" | "desc"> = {
  presenze: "asc",
  minuti: "asc",
  titolarita_pct: "asc",
  rating: "asc",
  fvm: "asc",
  gol: "asc",
  assist: "asc",
  xG: "asc",
  xA: "asc",
  tiri: "asc",
  tiri_in_porta: "asc",
  rigori_gol: "asc",
  occasioni_create: "asc",
  big_chances: "asc",
  tocchi_area: "asc",
  clean_sheet: "asc",
  rigori_parati: "asc",
  gol_subiti: "desc",
  score_finale: "asc",
  gialli: "desc",
  rossi: "desc",
};

function colorClass(
  p: Player,
  c: Col,
  percentili: Record<string, Record<string, { lo: number; hi: number }>>
): string {
  const dir = COLOR_DIR[String(c.key)];
  if (!dir) return "";
  const th = percentili[String(c.key)]?.[p.ruolo];
  if (!th) return "";
  const v = Number(cellValue(p, c.key));
  if (isNaN(v)) return "";
  if (dir === "desc") {
    if (v <= th.lo) return "cell-good";
    if (v <= th.hi) return "cell-mid";
    return "cell-bad";
  }
  if (v <= th.lo) return "cell-bad";
  if (v <= th.hi) return "cell-mid";
  return "cell-good";
}

const RUOLO_SHORT: Record<string, string> = {
  keeper: "POR",
  "center back": "DC",
  "left back": "TS",
  "right back": "TD",
  "left wing-back": "ES",
  "right wing-back": "ED",
  "defensive midfielder": "CDC",
  "central midfielder": "CC",
  "attacking midfielder": "COC",
  "left midfielder": "ES",
  "right midfielder": "ED",
  "left winger": "AS",
  "right winger": "AD",
  striker: "ATT",
  forward: "ATT",
  midfielder: "CC",
  defender: "DC",
};

function ruoloShort(ruolo: string | null): string {
  if (!ruolo) return "–";
  return RUOLO_SHORT[ruolo.toLowerCase()] ?? ruolo;
}

type BadgeDef = {
  key: string;
  label: string;
  cls: string;
  desc: string;
  showFor?: string[];
  test: (p: Player) => boolean;
};

const BADGES: BadgeDef[] = [
  { key: "assistman", label: "assistman", cls: "assistman", desc: "assist ≥ 6 o xA ≥ 5 (portieri: assist ≥ 1)", showFor: ["P", "D", "C", "A"], test: (p) => (p.ruolo === "P" ? (p.assist ?? 0) >= 1 : (p.assist ?? 0) >= 6 || (p.xA ?? 0) >= 5) },
  { key: "rigorista", label: "rigorista", cls: "rigorista", desc: "rigori segnati ≥ 2 o xG da rigori ≥ 1.5", showFor: ["D", "C", "A"], test: (p) => (p.rigori_gol ?? 0) >= 2 || (p.xG ?? 0) - (p.xG_no_rigori ?? 0) >= 1.5 },
  { key: "pararigori", label: "pararigori", cls: "pararigori", desc: "rigori parati ≥ 2", showFor: ["P"], test: (p) => (p.rigori_parati ?? 0) >= 2 },
  { key: "cartellini", label: "cartellini", cls: "cartellini", desc: "gialli ≥ 9", showFor: ["P", "D", "C", "A"], test: (p) => (p.gialli ?? 0) >= 9 },
];

function getBadges(p: Player): BadgeDef[] {
  return BADGES.filter((b) => b.test(p));
}

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("P");
  const [query, setQuery] = useState("");
  const [team, setTeam] = useState("");
  const [badgeFilter, setBadgeFilter] = useState("");
  const [sortKey, setSortKey] = useState("base");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [offerte, setOfferte] = useState<Offerta[]>([]);
  const [modalPlayer, setModalPlayer] = useState<Player | null>(null);
  const [importo, setImporto] = useState("");
  const [allenatore, setAllenatore] = useState("");
  const [squadraNome, setSquadraNome] = useState("");
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    fetch("/data/players.json")
      .then((r) => r.json())
      .then((d: Player[]) => {
        setPlayers(d);
        // precompila offerte dal piano 500
        const pre = d.filter((p) => p.offerta != null).map<Offerta>((p) => ({
          nome: p.nome,
          ruolo: p.ruolo,
          offerta: p.offerta as number,
          esito: "pending",
        }));
        setOfferte((cur) => (cur.length ? cur : pre));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    try {
      const s = localStorage.getItem("efl-offerte");
      if (s) setOfferte(JSON.parse(s));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("efl-offerte", JSON.stringify(offerte));
    } catch {}
  }, [offerte]);

  useEffect(() => {
    try {
      const s = localStorage.getItem("efl-onboard");
      if (s) {
        const o = JSON.parse(s);
        if (o.onboarded) setOnboarded(true);
        if (o.allenatore) setAllenatore(o.allenatore);
        if (o.squadra) setSquadraNome(o.squadra);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("efl-onboard", JSON.stringify({ onboarded, allenatore, squadra: squadraNome }));
    } catch {}
  }, [onboarded, allenatore, squadraNome]);

  useEffect(() => {
    if (badgeFilter) {
      const b = BADGES.find((x) => x.key === badgeFilter);
      if (b && b.showFor && !b.showFor.includes(role)) setBadgeFilter("");
    }
  }, [role, badgeFilter]);

  function confermaOnboarding() {
    if (!allenatore.trim()) return;
    setOnboarded(true);
  }

  function addOfferta(nome: string, ruolo: string, offerta: number) {
    setOfferte((o) => [...o, { nome, ruolo, offerta, esito: "pending" }]);
  }
  function rimuoviOfferta(i: number) {
    setOfferte((o) => o.filter((_, idx) => idx !== i));
  }
  function setOffertaValore(i: number, val: number) {
    setOfferte((o) => o.map((x, idx) => (idx === i ? { ...x, offerta: val } : x)));
  }
  function ciclaEsito(i: number) {
    setOfferte((o) =>
      o.map((x, idx) => {
        if (idx !== i) return x;
        const next: Esito = x.esito === "pending" ? "vinto" : x.esito === "vinto" ? "perso" : "pending";
        return { ...x, esito: next };
      })
    );
  }

  function openModal(p: Player) {
    setModalPlayer(p);
    setImporto(p.base != null ? String(p.base) : "");
  }
  function confirmAdd() {
    if (!modalPlayer) return;
    const pr = Number(importo);
    if (isNaN(pr) || pr < 0) return;
    addOfferta(modalPlayer.nome, modalPlayer.ruolo, pr);
    setModalPlayer(null);
  }

  const teams = useMemo(
    () => Array.from(new Set(players.map((p) => p.squadra))).sort(),
    [players]
  );

  const filtered = useMemo(() => {
    let list = players.filter((p) => p.ruolo === role);
    if (team) list = list.filter((p) => p.squadra === team);
    if (badgeFilter) {
      const b = BADGES.find((x) => x.key === badgeFilter);
      if (b) list = list.filter((p) => b.test(p));
    }
    const col = COLUMNS.find((c) => c.key === sortKey);
    const isNum = col?.num;
    const dir = sortDir === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      const av = cellValue(a, sortKey);
      const bv = cellValue(b, sortKey);
      if (av === null || av === undefined || av === "") return 1;
      if (bv === null || bv === undefined || bv === "") return -1;
      if (isNum) return (Number(av) - Number(bv)) * dir;
      return String(av).localeCompare(String(bv), "it") * dir;
    });
    return list;
  }, [players, role, team, badgeFilter, sortKey, sortDir]);

  const queryMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return new Set<string>();
    return new Set(players.filter((p) => p.nome.toLowerCase().includes(q)).map((p) => p.nome));
  }, [players, query]);

  useEffect(() => {
    if (queryMatch.size === 0) return;
    const el = document.querySelector("tr.search-match");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [queryMatch, sortKey, sortDir, role, team, badgeFilter]);

  const visibleCols = useMemo(
    () => COLUMNS.filter((c) => !c.showFor || c.showFor.includes(role)),
    [role]
  );

  const percentili = useMemo(() => {
    const map: Record<string, Record<string, { lo: number; hi: number }>> = {};
    for (const c of COLUMNS) {
      const key = String(c.key);
      if (!COLOR_DIR[key]) continue;
      map[key] = {};
      for (const r of ["P", "D", "C", "A"]) {
        const vals = players
          .filter((p) => p.ruolo === r)
          .map((p) => Number(cellValue(p, key)))
          .filter((v) => !isNaN(v));
        vals.sort((a, b) => a - b);
        if (vals.length >= 5) {
          map[key][r] = {
            lo: vals[Math.floor(vals.length * 0.4)],
            hi: vals[Math.floor(vals.length * 0.7)],
          };
        }
      }
    }
    return map;
  }, [players]);

  function onSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const vinti = offerte.filter((o) => o.esito === "vinto");
  const spesi = vinti.reduce((s, o) => s + (Number(o.offerta) || 0), 0);
  const presiPerRuolo: Record<string, number> = { P: 0, D: 0, C: 0, A: 0 };
  vinti.forEach((o) => {
    if (presiPerRuolo[o.ruolo] !== undefined) presiPerRuolo[o.ruolo]++;
  });

  if (!onboarded) {
    return (
      <div className="container">
        <div className="onboard">
          <h1>EuroFantaLeghe 2026/27</h1>
          <p className="onboard-sub">Buste chiuse · 26 giocatori (4P · 8D · 8C · 6A) · 500 crediti</p>
          <input placeholder="Nome allenatore" value={allenatore} onChange={(e) => setAllenatore(e.target.value)} />
          <input placeholder="Nome squadra" value={squadraNome} onChange={(e) => setSquadraNome(e.target.value)} />
          <button onClick={confermaOnboarding} disabled={!allenatore.trim()}>
            Inizia
          </button>
          <p className="onboard-warn">È indispensabile utilizzare l'app da desktop o laptop, sconsigliato smartphone o tablet.</p>
          <p className="onboard-credit">vibecoded by Lyons</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header>
        <div>
          <h1>EuroFantaLeghe 2026/27</h1>
          {allenatore && (
            <div className="saluto">
              Ciao, <strong>{allenatore}</strong>
              {squadraNome && <span className="saluto-squadra"> — {squadraNome}</span>}
            </div>
          )}
          <div className="sub">
            Listone e buste chiuse · {players.length} giocatori con statistiche FotMob
          </div>
        </div>
        <div className="asta-mini">
          <div className="crediti">
            Spesi (vinti): <strong>{spesi}</strong> / {BUDGET}
          </div>
          <div className="slot">
            Rosa: P {presiPerRuolo.P || 0}/{ROSA.P} · D {presiPerRuolo.D || 0}/{ROSA.D} · C {presiPerRuolo.C || 0}/{ROSA.C} · A {presiPerRuolo.A || 0}/{ROSA.A}
          </div>
        </div>
      </header>

      <div className="tabs">
        {RUOLI.map((r) => {
          const n = players.filter((p) => p.ruolo === r.key).length;
          return (
            <button
              key={r.key}
              className={"tab" + (role === r.key ? " active" : "")}
              onClick={() => setRole(r.key)}
            >
              {r.label} <span className="count">({n})</span>
            </button>
          );
        })}
        <button
          className={"tab" + (role === "rosa" ? " active" : "")}
          onClick={() => setRole("rosa")}
        >
          Buste
        </button>
      </div>

      {role === "rosa" ? (
        <Buste
          players={players}
          offerte={offerte}
          setOffertaValore={setOffertaValore}
          ciclaEsito={ciclaEsito}
          rimuoviOfferta={rimuoviOfferta}
          budget={BUDGET}
        />
      ) : (
        <>
          <div className="controls">
            <input
              type="search"
              placeholder="Cerca giocatore…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select value={team} onChange={(e) => setTeam(e.target.value)}>
              <option value="">Tutte le squadre</option>
              {teams.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="badge-bar">
            <button
              className={"badge-filter" + (badgeFilter === "" ? " active" : "")}
              onClick={() => setBadgeFilter("")}
            >
              tutti
            </button>
            {BADGES.filter((b) => !b.showFor || b.showFor.includes(role)).map((b) => (
              <button
                key={b.key}
                className={"badge-filter " + b.cls + (badgeFilter === b.key ? " active" : "")}
                onClick={() => setBadgeFilter(badgeFilter === b.key ? "" : b.key)}
              >
                {b.label}
              </button>
            ))}
          </div>

          <div className="table-wrap">
            {loading ? (
              <div className="loading">Caricamento…</div>
            ) : filtered.length === 0 ? (
              <div className="empty">Nessun giocatore trovato.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    {visibleCols.map((c) => (
                      <th
                        key={c.key}
                        className={sortKey === c.key ? "sorted" : ""}
                        data-tip={c.desc}
                        onClick={() => onSort(c.key)}
                      >
                        {c.label}
                        {sortKey === c.key && (
                          <span className="arrow">{sortDir === "asc" ? "▲" : "▼"}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr
                      key={p.id}
                      className={queryMatch.has(p.nome) ? "search-match" : ""}
                    >
                      {visibleCols.map((c) => {
                        if (c.key === "nome") {
                          return (
                            <td key={c.key} className="name">
                              <a
                                href={`https://www.fotmob.com/players/${p.fotmob_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="player-link"
                                title={p.nome}
                              >
                                {p.nome}
                              </a>
                              <button
                                className="add-btn"
                                title="Aggiungi offerta"
                                onClick={() => openModal(p)}
                              >
                                +
                              </button>
                              {p.injury_status && (
                                <span className="badge inj">infortunio</span>
                              )}
                              {getBadges(p).map((b) => (
                                <span key={b.key} className={"badge " + b.cls}>
                                  {b.label}
                                </span>
                              ))}
                            </td>
                          );
                        }
                        const isRuolo = c.key === "ruolo_reale";
                        return (
                          <td
                            key={c.key}
                            className={(c.num ? "num " : "") + colorClass(p, c, percentili)}
                            title={isRuolo && p.ruolo_reale ? p.ruolo_reale : undefined}
                          >
                            {isRuolo ? ruoloShort(p.ruolo_reale) : fmt(p, c)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="legend">
            <strong>Legenda:</strong>{" "}
            <span className="badge inj">infortunio</span> = infortunio attivo
            {BADGES.filter((b) => !b.showFor || b.showFor.includes(role)).map((b) => (
              <span key={b.key}>
                {" · "}
                <span className={"badge " + b.cls}>{b.label}</span> = {b.desc}
              </span>
            ))}
            <br />
            <strong>½ Quot.</strong> = metà quotazione (mercato inoltrato). <strong>MV</strong> = media voto FotMob 2025/26 (non fantavoto). <strong>Max bid</strong> = offerta massima suggerita dal piano.
            <br />
            Dati: listone ufficiale EuroLeghe 2026/27 + FotMob (stagione 2025/26). Titol.% = minuti su presenze.
          </div>
        </>
      )}

      {modalPlayer && (
        <div className="modal-overlay" onClick={() => setModalPlayer(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Aggiungi offerta</div>
            <div className="modal-name">
              {modalPlayer.nome} · {modalPlayer.squadra} ({modalPlayer.ruolo}) — base {modalPlayer.base ?? "–"}
            </div>
            <input
              type="number"
              min="0"
              autoFocus
              value={importo}
              onChange={(e) => setImporto(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmAdd()}
              placeholder="Offerta"
            />
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setModalPlayer(null)}>
                Annulla
              </button>
              <button className="modal-ok" onClick={confirmAdd}>
                Aggiungi
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="app-footer">vibecoded by Lyons</footer>
    </div>
  );
}
