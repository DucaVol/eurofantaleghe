export type Esito = "pending" | "vinto" | "perso";

export type Offerta = { nome: string; ruolo: string; offerta: number; esito: Esito };

export const BUDGET = 500;
export const ROSA: Record<string, number> = { P: 4, D: 8, C: 8, A: 6 };
export const ROSA_TOT = 26;
