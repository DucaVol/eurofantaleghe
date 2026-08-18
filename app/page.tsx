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
  ex_squadra: string | null;
  lega_storico: string | null;
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
  fantamedia: number | null;
  gialli: number | null;
  rossi: number | null;
  xG: number | null;
  xA: number | null;
  tiri: number | null;
  tiri_in_porta: number | null;
  rigori_gol: number | null;
  xG_no_rigori: number | null;
  rigori_xg: number | null;
  occasioni_create: number | null;
  big_chances: number | null;
  tocchi_area: number | null;
  tiri_punizione: number | null;
  tiri_da_corner: number | null;
  crosses: number | null;
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

type ConsigliSquadra = {
  squadra: string;
  data: string;
  consigliati: string[];
  sconsigliati: string[];
  nota?: string;
  tiratori?: string;
};

type ConsigliData = {
  aggiornato: string;
  fonte: string;
  squadre: ConsigliSquadra[];
  infortunati: string[];
};

type Col = {
  key: keyof Player | "nome" | "squadra";
  label: string;
  desc?: string;
  num?: boolean;
  dec?: number;
  pct?: boolean;
  per90?: boolean;
  suffix?: string;
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
  { key: "quotazione", label: "FVMp", num: true, dec: 0, desc: "Quotazione FVM dimezzata (FVM ÷ 2)" },
  { key: "rating", label: "MV", num: true, dec: 2, desc: "Media voto FotMob 2025/26 (NON è il fantavoto)" },
  { key: "fantamedia", label: "FM", num: true, dec: 2, desc: "Fantamedia 2025/26: media voto + bonus/malus (gol, assist, rigori, ammonizioni)" },
  { key: "eta", label: "Età", num: true, dec: 0, desc: "Età del giocatore" },
  { key: "ruolo_reale", label: "Pos.", desc: "Posizione reale secondo FotMob (può differire dal ruolo listone)" },
  { key: "presenze", label: "Pres.", num: true, dec: 0, desc: "Presenze 2025/26" },
  { key: "minuti", label: "Min.", num: true, dec: 0, desc: "Minuti giocati 2025/26" },
  { key: "titolarita_pct", label: "Titol.%", num: true, dec: 0, suffix: "%", desc: "Percentuale di minuti giocati sul totale della stagione (100% = sempre titolare)" },
  { key: "gol", label: "Gol", num: true, dec: 0, showFor: ["D", "C", "A"], desc: "Gol segnati 2025/26" },
  { key: "assist", label: "Assist", num: true, dec: 0, showFor: ["P", "D", "C", "A"], desc: "Assist 2025/26" },
  { key: "xG", label: "xG", num: true, dec: 1, showFor: ["D", "C", "A"], desc: "Expected Goals: gol attesi dalla qualità dei tiri" },
  { key: "xA", label: "xA", num: true, dec: 1, showFor: ["P", "D", "C", "A"], desc: "Expected Assists" },
  { key: "tiri", label: "Tiri", num: true, dec: 0, showFor: ["C", "A"], desc: "Tiri totali 2025/26" },
  { key: "tiri_in_porta", label: "In porta", num: true, dec: 0, showFor: ["D", "A"], desc: "Tiri nello specchio" },
  { key: "rigori_xg", label: "Rig.xG", num: true, dec: 1, showFor: ["D", "C", "A"], desc: "xG da calci di rigore (xG − non-penalty xG). Valore alto = tira i rigori" },
  { key: "tiri_punizione", label: "Puniz.", num: true, dec: 0, showFor: ["D", "C", "A"], desc: "Tiri diretti da punizione nella 2025/26 (segnale di battitore)" },
  { key: "crosses", label: "Cross", num: true, dec: 0, showFor: ["D", "C"], desc: "Cross riusciti (proxy di chi batte i corner)" },
  { key: "occasioni_create", label: "Occ. create", num: true, dec: 0, showFor: ["C"], desc: "Occasioni da gol create" },
  { key: "big_chances", label: "Big chance", num: true, dec: 0, showFor: ["C", "A"], desc: "Grandi occasioni create" },
  { key: "tocchi_area", label: "Tocchi area", num: true, dec: 0, showFor: ["D", "C", "A"], desc: "Tocchi in area avversaria" },
  { key: "clean_sheet", label: "Clean sheet", num: true, dec: 0, showFor: ["P"], desc: "Porte inviolate nella 2025/26 (bonus imbattibilità +1)" },
  { key: "rigori_parati", label: "Parati", num: true, dec: 0, showFor: ["P"], desc: "Rigori parati nella 2025/26 (bonus +3 ciascuno)" },
  { key: "gol_subiti", label: "Subiti", num: true, dec: 0, showFor: ["P"], desc: "Gol subiti nella 2025/26 (meno sono, meglio è)" },
  { key: "gialli", label: "Gialli", num: true, dec: 0, desc: "Ammonizioni (malus)" },
  { key: "rossi", label: "Rossi", num: true, dec: 0, desc: "Espulsioni (malus)" },
  { key: "score_finale", label: "Score", num: true, dec: 0, desc: "Indice 0-100: titolarità + produzione + valore + rischio (per ruolo)" },
];

function cellValue(p: Player, key: string): string | number | null {
  return (p as Record<string, unknown>)[key] as string | number | null;
}

function fmt(p: Player, c: Col): string {
  const v = cellValue(p, c.key);
  if (v === null || v === undefined || v === "") return "–";
  if (c.pct) return Math.round(Number(v) * 100) + "%";
  if (c.per90) return Math.round(Number(v) * 90) + "'";
  if (c.suffix) return Number(v).toFixed(c.dec ?? 0) + c.suffix;
  if (c.num) return Number(v).toFixed(c.dec ?? 0);
  return String(v);
}

const COLOR_DIR: Record<string, "asc" | "desc"> = {
  presenze: "asc",
  minuti: "asc",
  titolarita_pct: "asc",
  rating: "asc",
  fantamedia: "asc",
  gol: "asc",
  assist: "asc",
  xG: "asc",
  xA: "asc",
  tiri: "asc",
  tiri_in_porta: "asc",
  rigori_gol: "asc",
  rigori_xg: "asc",
  occasioni_create: "asc",
  big_chances: "asc",
  tocchi_area: "asc",
  tiri_punizione: "asc",
  crosses: "asc",
  clean_sheet: "asc",
  rigori_parati: "asc",
  gol_subiti: "desc",
  score_finale: "asc",
  gialli: "desc",
  rossi: "desc",
};

function shortlistFilter(p: Player): boolean {
  const tit = Number(p.titolarita_pct) || 0;
  if (p.ruolo === "P") return tit >= 70 && ((Number(p.clean_sheet) || 0) >= 5 || (Number(p.rating) || 0) >= 6.8);
  if (p.ruolo === "D") return tit >= 80 && (Number(p.rating) || 0) >= 6.6;
  if (p.ruolo === "C") return tit >= 78 && ((Number(p.fantamedia) || 0) >= 6.0 || (Number(p.gol) || 0) + (Number(p.assist) || 0) >= 8);
  if (p.ruolo === "A") return tit >= 75 && ((Number(p.gol) || 0) >= 8 || (Number(p.xG) || 0) >= 9);
  return true;
}

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

const LEGA_SHORT: Record<string, string> = {
  "Premier League": "Premier",
  LaLiga: "Liga",
  Bundesliga: "Bundesliga",
  "Serie A": "Serie A",
  "Ligue 1": "Ligue 1",
  "2. Bundesliga": "2. Bundesliga",
  "Ligue 2": "Ligue 2",
  "Serie B": "Serie B",
  Championship: "Championship",
  "Belgian Pro League": "Belgio",
  Eredivisie: "Eredivisie",
  LaLiga2: "LaLiga 2",
  "Liga Portugal": "Portogallo",
  "Super Lig": "Süper Lig",
  "Saudi Pro League": "Arabia",
  "Super League": "Svizzera",
  Allsvenskan: "Svezia",
  Ekstraklasa: "Polonia",
  "1. Liga": "Svizzera B",
  "Liga Profesional Apertura": "Argentina",
};

const EX_SQUADRA_SHORT: Record<string, string> = {
  "Bayer Leverkusen": "Leverkusen",
  "Borussia Dortmund": "Dortmund",
  "Borussia Mönchengladbach": "Gladbach",
  "Paris Saint-Germain": "PSG",
  "Manchester City": "Man City",
  "Manchester United": "Man Utd",
  "Atletico Madrid": "Atlético",
  "Atlético Madrid": "Atlético",
  "VfB Stuttgart": "Stoccarda",
  "Tottenham Hotspur": "Tottenham",
  "AFC Bournemouth": "Bournemouth",
  "Club Brugge": "Brugge",
  "Athletic Club": "Athletic Bilbao",
  "Real Madrid Castilla": "Castilla",
  "Nottingham Forest": "Nottingham",
  "Newcastle United": "Newcastle",
};

function legaBadge(p: Player): string {
  if (p.ex_squadra) {
    return "dati " + (EX_SQUADRA_SHORT[p.ex_squadra] ?? p.ex_squadra);
  }
  return "dati " + (LEGA_SHORT[p.lega_storico ?? ""] ?? p.lega_storico);
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
  { key: "punizioni", label: "punizioni", cls: "punizioni", desc: "tiri da punizione ≥ 5", showFor: ["D", "C", "A"], test: (p) => (p.tiri_punizione ?? 0) >= 5 },
  { key: "rigorista", label: "rigorista", cls: "rigorista", desc: "rigori segnati ≥ 2 o xG da rigori ≥ 1.5", showFor: ["D", "C", "A"], test: (p) => (p.rigori_gol ?? 0) >= 2 || (p.rigori_xg ?? 0) >= 1.5 },
  { key: "pararigori", label: "pararigori", cls: "pararigori", desc: "rigori parati ≥ 2", showFor: ["P"], test: (p) => (p.rigori_parati ?? 0) >= 2 },
  { key: "cartellini", label: "cartellini", cls: "cartellini", desc: "gialli ≥ 9", showFor: ["P", "D", "C", "A"], test: (p) => (p.gialli ?? 0) >= 9 },
];

function getBadges(p: Player): BadgeDef[] {
  return BADGES.filter((b) => b.test(p));
}

function ScoreInfo() {
  const box = { border: "1px solid #333", borderRadius: 8, padding: "14px 16px", margin: "10px 0" } as const;
  const row = { display: "flex", justifyContent: "space-between", gap: 12, padding: "4px 0", borderBottom: "1px dashed #2a2a2a" } as const;
  const h3 = { margin: "18px 0 8px", fontSize: 15 } as const;
  const max = (n: number) => <span style={{ color: "#888" }}>max {n}</span>;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: 16 }}>
      <h2>Come funziona lo Score</h2>
      <p style={{ color: "#bbb" }}>
        Indice 0–100 di convenienza (qualità rispetto al prezzo). I minuti non contano due volte:
        la Titolarità premia quanto giochi, il bonus reparto quanto produci quando giochi
        (statistiche per 90 minuti). Dati: stagione 2025/26.
      </p>

      <h3 style={h3}>Componenti comuni a tutti i ruoli</h3>
      <div style={box}>
        <div style={row}><span><strong>Titolarità</strong> — % di minuti giocati sul totale stagione</span>{max(35)}</div>
        <div style={row}><span><strong>Rating MV</strong> — media voto FotMob: 6.0 = 0, 8.0+ = punteggio pieno</span>{max(25)}</div>
        <div style={row}><span><strong>Valore</strong> — premia la quotazione bassa: 20 − quotazione/2.5</span>{max(20)}</div>
        <div style={row}><span><strong>Cartellini</strong> — penalità: gialli × 0.5 + rossi × 3</span><span style={{ color: "#e66" }}>−5</span></div>
      </div>

      <h3 style={h3}>Bonus per reparto (per 90 minuti)</h3>

      <div style={box}>
        <strong>Portieri</strong>
        <div style={row}><span>Clean sheet % (porte inviolate ÷ presenze)</span>{max(10)}</div>
        <div style={row}><span>Gol subiti /90 (meno = meglio)</span>{max(10)}</div>
      </div>

      <div style={box}>
        <strong>Difensori</strong>
        <div style={row}><span>Gol /90</span>{max(4)}</div>
        <div style={row}><span>Assist /90</span>{max(4)}</div>
        <div style={row}><span>Expected assist (xA) /90</span>{max(6)}</div>
        <div style={row}><span>Tocchi in area /90</span>{max(6)}</div>
      </div>

      <div style={box}>
        <strong>Centrocampisti</strong>
        <div style={row}><span>Gol /90</span>{max(4)}</div>
        <div style={row}><span>Assist /90</span>{max(3)}</div>
        <div style={row}><span>Non-penalty xG /90</span>{max(3)}</div>
        <div style={row}><span>Expected assist (xA) /90</span>{max(3)}</div>
        <div style={row}><span>Tocchi in area /90</span>{max(2)}</div>
        <div style={row}><span>Tiri /90</span>{max(2)}</div>
        <div style={row}><span>Occasioni create /90</span>{max(3)}</div>
      </div>

      <div style={box}>
        <strong>Attaccanti</strong>
        <div style={row}><span>Gol /90</span>{max(8)}</div>
        <div style={row}><span>Non-penalty xG /90</span>{max(6)}</div>
        <div style={row}><span>Tiri in porta /90</span>{max(4)}</div>
        <div style={row}><span>Tocchi in area /90</span>{max(2)}</div>
      </div>

      <p style={{ color: "#888", marginTop: 14 }}>
        Le statistiche /90 sono normalizzate sui percentili del ruolo (scale fisse). Totale 0–100
        prima dei cartellini. Chi gioca poco è penalizzato dalla Titolarità, non due volte.
      </p>
    </div>
  );
}

function Consigli() {
  const [data, setData] = useState<ConsigliData | null>(null);
  useEffect(() => {
    fetch("/data/consigli.json")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data) return <div style={{ padding: 16, color: "#888" }}>Caricamento…</div>;

  const squadraBox = { border: "1px solid #333", borderRadius: 8, padding: "12px 14px", margin: "12px 0" } as const;
  const title = { margin: "0 0 8px", fontSize: 15, display: "flex", justifyContent: "space-between", alignItems: "baseline" } as const;
  const col = { flex: 1, minWidth: 240 } as const;
  const item = { padding: "3px 0", fontSize: 13.5, lineHeight: 1.4 } as const;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: 16 }}>
      <h2>Consigli dagli articoli</h2>
      <p style={{ color: "#888", fontSize: 13 }}>
        Fonte: {data.fonte} · aggiornato {data.aggiornato}. Consigliati/sconsigliati estratti dalle guide all'asta.
      </p>
      {data.squadre.map((s) => (
        <div key={s.squadra} style={squadraBox}>
          <div style={title}>
            <strong>{s.squadra}</strong>
            <span style={{ color: "#777", fontSize: 12 }}>{s.data}</span>
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div style={col}>
              <div style={{ color: "#7c7", fontWeight: 600, marginBottom: 4 }}>Consigliati</div>
              {s.consigliati.map((c) => <div key={c} style={item}>• {c}</div>)}
            </div>
            <div style={col}>
              <div style={{ color: "#e66", fontWeight: 600, marginBottom: 4 }}>Sconsigliati</div>
              {s.sconsigliati.map((c) => <div key={c} style={item}>• {c}</div>)}
            </div>
          </div>
          {s.nota && <div style={{ color: "#999", fontSize: 12.5, marginTop: 6 }}>Nota: {s.nota}</div>}
          {s.tiratori && <div style={{ color: "#cb9", fontSize: 12.5, marginTop: 4 }}>Tiratori calci da fermo: {s.tiratori}</div>}
        </div>
      ))}
      <h3 style={{ margin: "20px 0 8px", fontSize: 15 }}>Infortunati di lungo corso</h3>
      <div style={squadraBox}>
        {data.infortunati.map((i) => <div key={i} style={item}>• {i}</div>)}
      </div>
    </div>
  );
}

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("P");
  const [query, setQuery] = useState("");
  const [team, setTeam] = useState("");
  const [badgeFilter, setBadgeFilter] = useState("");
  const [shortlist, setShortlist] = useState(false);
  const [sortKey, setSortKey] = useState("base");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [offerte, setOfferte] = useState<Offerta[]>([]);
  const [modalPlayer, setModalPlayer] = useState<Player | null>(null);
  const [importo, setImporto] = useState("");
  const [allenatore, setAllenatore] = useState("");
  const [squadraNome, setSquadraNome] = useState("");
  const [consigliMatch, setConsigliMatch] = useState<Record<string, string[]>>({});
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
    fetch("/data/consigli_match.json")
      .then((r) => r.json())
      .then((d) => setConsigliMatch(d))
      .catch(() => {});
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

  function resetOfferte() {
    if (!window.confirm("Ricarico il piano precompilato dal master? Sovrascrive le offerte attuali.")) return;
    const pre = players
      .filter((p) => p.offerta != null)
      .map<Offerta>((p) => ({
        nome: p.nome,
        ruolo: p.ruolo,
        offerta: p.offerta as number,
        esito: "pending",
      }));
    setOfferte(pre);
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

  const nomiInOfferta = useMemo(() => new Set(offerte.map((o) => o.nome.toLowerCase())), [offerte]);

  const filtered = useMemo(() => {
    let list = players.filter((p) => p.ruolo === role);
    if (team) list = list.filter((p) => p.squadra === team);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((p) => p.nome.toLowerCase().includes(q));
    }
    if (shortlist) list = list.filter((p) => shortlistFilter(p) || nomiInOfferta.has(p.nome.toLowerCase()));
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
  }, [players, role, team, badgeFilter, sortKey, sortDir, query, shortlist]);

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
        <button
          className={"tab" + (role === "info" ? " active" : "")}
          onClick={() => setRole("info")}
        >
          Come funziona lo score
        </button>
        <button
          className={"tab" + (role === "consigli" ? " active" : "")}
          onClick={() => setRole("consigli")}
        >
          Consigli
        </button>
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

      {role === "info" ? (
        <ScoreInfo />
      ) : role === "consigli" ? (
        <Consigli />
      ) : role === "rosa" ? (
        <Buste
          players={players}
          offerte={offerte}
          setOffertaValore={setOffertaValore}
          ciclaEsito={ciclaEsito}
          rimuoviOfferta={rimuoviOfferta}
          budget={BUDGET}
          resetOfferte={resetOfferte}
          consigliMatch={consigliMatch}
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
              className={"badge-filter shortlist-toggle" + (shortlist ? " active" : "")}
              onClick={() => setShortlist(!shortlist)}
              title="Filtra il rumore per ruolo (include sempre i giocatori nelle tue offerte): P tit≥70% e (CS≥5 o MV≥6.8) · D tit≥80% e MV≥6.6 · C tit≥78% e (FM≥6 o G+A≥8) · A tit≥75% e (gol≥8 o xG≥9)"
            >
              ⚡ Filtra rumore{shortlist ? ` (${filtered.length})` : ""}
            </button>
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
                      className={
                        (queryMatch.has(p.nome) ? "search-match " : "") +
                        (nomiInOfferta.has(p.nome.toLowerCase()) ? "in-offerta" : "")
                      }
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
                              {consigliMatch[p.nome]?.includes("consigliato") && (
                                <span className="seg seg-cons" title="Consigliato dagli articoli">✓</span>
                              )}
                              {consigliMatch[p.nome]?.includes("sconsigliato") && (
                                <span className="seg seg-scon" title="Sconsigliato dagli articoli">✗</span>
                              )}
                              {consigliMatch[p.nome]?.includes("tiratore") && (
                                <span className="seg seg-tir" title="Tiratore calci da fermo">⚽</span>
                              )}
                              <button
                                className="add-btn"
                                title="Aggiungi offerta"
                                onClick={() => openModal(p)}
                              >
                                +
                              </button>
                              {(p.ex_squadra || p.lega_storico) && (
                                <span className="badge new">{legaBadge(p)}</span>
                              )}
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
            <span className="badge new">dati [squadra/campionato]</span> = statistiche dalla squadra/campionato precedente (non comparabili 1:1) ·{" "}
            <span className="badge inj">infortunio</span> = infortunio attivo ·{" "}
            <span className="seg seg-cons">✓</span> consigliato dagli articoli ·{" "}
            <span className="seg seg-scon">✗</span> sconsigliato ·{" "}
            <span className="seg seg-tir">⚽</span> tiratore calci da fermo
            {BADGES.filter((b) => !b.showFor || b.showFor.includes(role)).map((b) => (
              <span key={b.key}>
                {" · "}
                <span className={"badge " + b.cls}>{b.label}</span> = {b.desc}
              </span>
            ))}
            <br />
            <strong>MV</strong> = media voto FotMob 2025/26 (non fantavoto). <strong>Score</strong> = indice 0-100 (titolarità + produzione + valore + rischio, calcolato per ruolo).
            <br />
            Dati: listone ufficiale EuroLeghe 2026/27 + FotMob (stagione 2025/26). Titol.% = % di minuti giocati sul totale stagione.
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
