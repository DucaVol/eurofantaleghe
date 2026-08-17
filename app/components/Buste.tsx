"use client";

import { useEffect, useMemo, useState } from "react";
import { ROSA, ROSA_TOT, type Offerta } from "../types";

type Player = {
  id: number | string;
  ruolo: string;
  nome: string;
  squadra: string;
  rating: number | null;
  fotmob_id: number | null;
};

const ROLE_LABEL: Record<string, string> = {
  P: "Portieri",
  D: "Difensori",
  C: "Centrocampisti",
  A: "Attaccanti",
};

const ORDINE = ["P", "D", "C", "A"];

type Need = { P: number; D: number; C: number; A: number };

const MODULI: { key: string; label: string; note: string; need: Need }[] = [
  { key: "343", label: "3-4-3", note: "3 difensori (no modificatore difesa)", need: { P: 1, D: 3, C: 4, A: 3 } },
  { key: "352", label: "3-5-2", note: "3 difensori (no modificatore difesa)", need: { P: 1, D: 3, C: 5, A: 2 } },
  { key: "433", label: "4-3-3", note: "4 difensori (attiva modificatore difesa)", need: { P: 1, D: 4, C: 3, A: 3 } },
  { key: "442", label: "4-4-2", note: "4 difensori (attiva modificatore difesa)", need: { P: 1, D: 4, C: 4, A: 2 } },
  { key: "451", label: "4-5-1", note: "4 difensori (attiva modificatore difesa)", need: { P: 1, D: 4, C: 5, A: 1 } },
  { key: "532", label: "5-3-2", note: "5 difensori (attiva modificatore difesa)", need: { P: 1, D: 5, C: 3, A: 2 } },
  { key: "541", label: "5-4-1", note: "5 difensori (attiva modificatore difesa)", need: { P: 1, D: 5, C: 4, A: 1 } },
];

function rigaPos(ruolo: string, n: number, y: number): { ruolo: string; x: number; y: number }[] {
  if (n <= 0) return [];
  if (n === 1) return [{ ruolo, x: 50, y }];
  if (n === 2 && ruolo === "A") return [{ ruolo, x: 36.7, y }, { ruolo, x: 63.3, y }];
  if (n === 3) return [{ ruolo, x: 20, y }, { ruolo, x: 50, y }, { ruolo, x: 80, y }];
  return Array.from({ length: n }, (_, i) => ({
    ruolo,
    x: Math.round((10 + (i * 80) / (n - 1)) * 10) / 10,
    y,
  }));
}

function buildPosizioni(need: Need): { ruolo: string; x: number; y: number }[] {
  return [
    { ruolo: "P", x: 50, y: 90 },
    ...rigaPos("D", need.D, 72),
    ...rigaPos("C", need.C, 50),
    ...rigaPos("A", need.A, 26),
  ];
}

const ESITO_LABEL: Record<string, string> = {
  pending: "in attesa",
  vinto: "vinto",
  perso: "perso",
};

export default function Buste({
  players,
  offerte,
  setOffertaValore,
  ciclaEsito,
  rimuoviOfferta,
  budget,
}: {
  players: Player[];
  offerte: Offerta[];
  setOffertaValore: (i: number, val: number) => void;
  ciclaEsito: (i: number) => void;
  rimuoviOfferta: (i: number) => void;
  budget: number;
}) {
  const [modulo, setModulo] = useModulo();

  const vinti = offerte.filter((o) => o.esito === "vinto");
  const pending = offerte.filter((o) => o.esito === "pending");

  const spesi = vinti.reduce((s, o) => s + (Number(o.offerta) || 0), 0);
  const rimasti = budget - spesi;
  const totOfferte = offerte.reduce((s, o) => s + (Number(o.offerta) || 0), 0);

  const presiPerRuolo: Record<string, number> = { P: 0, D: 0, C: 0, A: 0 };
  vinti.forEach((o) => {
    if (presiPerRuolo[o.ruolo] !== undefined) presiPerRuolo[o.ruolo]++;
  });

  const slotRimasti = ROSA_TOT - vinti.length;
  const spesaMedia = slotRimasti > 0 ? rimasti / slotRimasti : 0;

  const mod = MODULI.find((m) => m.key === modulo) || MODULI[0];

  function playerInfo(nome: string): Player | undefined {
    return players.find((x) => x.nome.toLowerCase() === nome.toLowerCase());
  }

  function cognome(n: string): string {
    const parts = n.split(" ");
    return parts[parts.length - 1];
  }

  // titolari: tra i vinti, ordina per rating e prendi i need[r]
  const titolari = useMemo(() => {
    const byRuolo: Record<string, Player[]> = { P: [], D: [], C: [], A: [] };
    for (const o of vinti) {
      const p = playerInfo(o.nome);
      if (p && byRuolo[p.ruolo]) byRuolo[p.ruolo].push(p);
    }
    ORDINE.forEach((r) => {
      byRuolo[r].sort((a, b) => (b.rating || 0) - (a.rating || 0));
      byRuolo[r] = byRuolo[r].slice(0, mod.need[r as keyof Need]);
    });
    return byRuolo;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vinti, players, mod]);

  const campo = useMemo(() => {
    const used: Record<string, number> = { P: 0, D: 0, C: 0, A: 0 };
    return buildPosizioni(mod.need).map((s) => {
      const list = titolari[s.ruolo] || [];
      const idx = used[s.ruolo];
      used[s.ruolo]++;
      return { ...s, player: list[idx] ?? null };
    });
  }, [mod, titolari]);

  const titolariCount = campo.filter((s) => s.player).length;
  const titolariNomi = new Set(campo.map((s) => s.player?.nome).filter(Boolean) as string[]);
  const panchinari = vinti.filter((o) => !titolariNomi.has(o.nome));

  // raggruppa offerte per ruolo per il tracker
  const perRuolo = useMemo(() => {
    const m: Record<string, { idx: number }[]> = { P: [], D: [], C: [], A: [] };
    offerte.forEach((o, idx) => {
      if (m[o.ruolo]) m[o.ruolo].push({ idx });
    });
    ORDINE.forEach((r) => m[r].sort((a, b) => offerte[a.idx].nome.localeCompare(offerte[b.idx].nome)));
    return m;
  }, [offerte]);

  return (
    <div>
      <div className="asta-stato">
        <div className="stat">
          <div className="stat-label">Budget</div>
          <div className="stat-val">
            {rimasti} <span className="stat-unit">/ {budget} rimasti</span>
          </div>
          <div className="stat-sub">spesi (vinti) {spesi}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Rosa</div>
          <div className="stat-val">
            {vinti.length} <span className="stat-unit">/ {ROSA_TOT}</span>
          </div>
          <div className="stat-sub">{slotRimasti} slot da riempire</div>
        </div>
        <div className="stat">
          <div className="stat-label">Spesa media per slot</div>
          <div className="stat-val">
            {spesaMedia.toFixed(1)} <span className="stat-unit">cr/slot</span>
          </div>
          <div className="stat-sub">budget residuo ÷ slot rimasti</div>
        </div>
        <div className="stat">
          <div className="stat-label">Offerte in attesa</div>
          <div className="stat-val">
            {pending.length} <span className="stat-unit">offerte</span>
          </div>
          <div className="stat-sub">totale offerte attive {totOfferte} cr</div>
        </div>
      </div>

      <div className="asta-slot">
        {ORDINE.map((r) => {
          const p = presiPerRuolo[r] || 0;
          const t = ROSA[r];
          const pieno = p >= t;
          return (
            <div key={r} className={"slot" + (pieno ? " pieno" : "")}>
              <div className="slot-ruolo">{ROLE_LABEL[r]}</div>
              <div className="slot-num">
                {p}/{t}
              </div>
            </div>
          );
        })}
      </div>

      <div className="totale-bar">
        <span>
          Vinti: <strong className="big">{vinti.length}</strong> giocatori · <strong className="big">{spesi}</strong> cr
        </span>
        <span className={rimasti < 0 ? "over" : "ok"}>
          Budget residuo: <strong className="big">{rimasti}</strong> cr
        </span>
        <span>
          Totale offerte (se vinci tutto): <strong className="big">{totOfferte}</strong> cr{" "}
          {totOfferte > budget && <span className="over">(sfora di {totOfferte - budget})</span>}
        </span>
      </div>

      <div className="modulo-switch">
        {MODULI.map((m) => (
          <button
            key={m.key}
            className={"modulo-btn" + (modulo === m.key ? " active" : "")}
            onClick={() => setModulo(m.key)}
            title={m.note}
          >
            {m.label}
          </button>
        ))}
        <span className="modulo-coperti">
          Titolari coperti: <strong>{titolariCount}</strong>/11
        </span>
      </div>

      <div className="campo-wrap">
        <div className="rosa-col">
          <h4>Titolari</h4>
          {ORDINE.map((r) => {
            const list = campo.filter((s) => s.player?.ruolo === r).map((s) => s.player!);
            if (list.length === 0) return null;
            return (
              <div key={r} className="rosa-gruppo">
                <div className="rosa-ruolo">{ROLE_LABEL[r]}</div>
                {list.map((p) => (
                  <div key={p.id} className="rosa-gioc">
                    <span>{cognome(p.nome)}</span>
                    <span className="rosa-mv">{p.rating != null ? p.rating.toFixed(1) : "–"}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div className="campo">
          {campo.map((s, i) => (
            <div
              key={i}
              className={"campo-slot " + (s.player ? "piena" : "vuota")}
              style={{ left: s.x + "%", top: s.y + "%" }}
            >
              {s.player ? (
                <>
                  <span className="pedina-nome">{cognome(s.player.nome)}</span>
                  <span className="pedina-rating">{s.player.rating != null ? "MV " + s.player.rating.toFixed(1) : "–"}</span>
                </>
              ) : (
                <span className="pedina-ruolo">{s.ruolo}</span>
              )}
            </div>
          ))}
        </div>

        <div className="rosa-col">
          <h4>Panchina (vinti)</h4>
          {ORDINE.map((r) => {
            const list = panchinari.filter((o) => o.ruolo === r);
            if (list.length === 0) return null;
            return (
              <div key={r} className="rosa-gruppo">
                <div className="rosa-ruolo">{ROLE_LABEL[r]}</div>
                {list.map((o, i) => {
                  const p = playerInfo(o.nome);
                  return (
                    <div key={i} className="rosa-gioc">
                      <span>{cognome(o.nome)}</span>
                      <span className="rosa-mv">{p && p.rating != null ? p.rating.toFixed(1) : "–"}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="asta-acquisti">
        <div className="reparto-head">
          <h3>Le tue offerte ({offerte.length})</h3>
          <span className="reparto-slot">clicca l'esito per ruotare: in attesa → vinto → perso</span>
        </div>
        {ORDINE.map((r) => {
          const list = perRuolo[r] || [];
          if (list.length === 0) return null;
          const subTot = list.reduce((s, e) => s + (Number(offerte[e.idx].offerta) || 0), 0);
          return (
            <div key={r} className="asta-reparto">
              <div className="rosa-ruolo">
                {ROLE_LABEL[r]} ({list.length}) — {subTot} cr
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Giocatore</th>
                    <th>Squadra</th>
                    <th className="num">Offerta</th>
                    <th>Esito</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(({ idx }) => {
                    const o = offerte[idx];
                    const p = playerInfo(o.nome);
                    return (
                      <tr
                        key={idx}
                        className={o.esito === "vinto" ? "offerta-vinta" : o.esito === "perso" ? "offerta-persa" : ""}
                      >
                        <td className="name">
                          <a
                            href={`https://www.fotmob.com/players/${p?.fotmob_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="player-link"
                          >
                            {o.nome}
                          </a>
                        </td>
                        <td className="team">{p?.squadra ?? "–"}</td>
                        <td className="num">
                          <input
                            type="number"
                            min="0"
                            className="offerta-input"
                            value={o.offerta}
                            onChange={(e) => setOffertaValore(idx, Math.max(0, Number(e.target.value) || 0))}
                          />
                        </td>
                        <td>
                          <button className={"esito-btn " + o.esito} onClick={() => ciclaEsito(idx)}>
                            {ESITO_LABEL[o.esito]}
                          </button>
                        </td>
                        <td>
                          <button className="rm" onClick={() => rimuoviOfferta(idx)}>
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function useModulo(): [string, (m: string) => void] {
  const [modulo, setModulo] = useState("433");
  useEffect(() => {
    try {
      const s = localStorage.getItem("efl-modulo");
      if (s) setModulo(s);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("efl-modulo", modulo);
    } catch {}
  }, [modulo]);
  return [modulo, setModulo];
}
