import { apiFetchAuth, ApiRequestError } from "@/services/api";

// ── Types ────────────────────────────────────────────────────────────────────

export type MstRegu = {
  idRegu: number;
  idBagian: number;
  namaRegu: string;
  kepalaRegu: number | null;
  namaKepalaRegu: string | null;
};

export type MstOperator = {
  idOperator: number;
  namaOperator: string;
  enable: boolean;
};

export type ShiftHour = {
  tanggal: string;
  shift: number;
  hourStart: string;
  hourEnd: string;
};

export type OverlapResult = {
  isOverlap: boolean;
  conflicts: {
    noProduksi?: string;
    hourStart?: string;
    hourEnd?: string;
    [k: string]: unknown;
  }[];
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function requireToken(token: string | undefined): string {
  if (!token) throw new ApiRequestError("Tidak terautentikasi");
  return token;
}

function asInt(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function asIntOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

function asString(v: unknown): string {
  return v == null ? "" : String(v);
}

function asBool(v: unknown, fallback = true): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1") return true;
    if (s === "false" || s === "0") return false;
  }
  return fallback;
}

function asTimeHHmm(v: unknown): string {
  if (typeof v !== "string") return "";
  const m = v.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return v.trim().slice(0, 5);
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

function rowsOf(res: {
  data: unknown;
}): Record<string, unknown>[] {
  const d = res.data as { data?: unknown } | null | undefined;
  return Array.isArray(d?.data) ? (d.data as Record<string, unknown>[]) : [];
}

// ── Regu ─────────────────────────────────────────────────────────────────────

export function parseRegu(j: Record<string, unknown>): MstRegu {
  return {
    idRegu: asInt(j["IdRegu"] ?? j["idRegu"]),
    idBagian: asInt(j["IdBagian"] ?? j["idBagian"]),
    namaRegu: asString(j["NamaRegu"] ?? j["namaRegu"]),
    kepalaRegu: asIntOrNull(j["KepalaRegu"] ?? j["kepalaRegu"]),
    namaKepalaRegu:
      asString(j["NamaKepalaRegu"] ?? j["namaKepalaRegu"]) || null,
  };
}

export async function fetchReguList(
  token: string | undefined,
  idBagian?: number,
): Promise<MstRegu[]> {
  const t = requireToken(token);
  const qs = idBagian != null ? `?idBagian=${idBagian}` : "";
  const res = await apiFetchAuth(`/mst/regu${qs}`, t);
  return rowsOf(res).map(parseRegu);
}

// ── Operator ─────────────────────────────────────────────────────────────────

export function parseOperator(j: Record<string, unknown>): MstOperator {
  return {
    idOperator: asInt(j["IdOperator"] ?? j["idOperator"]),
    namaOperator: asString(j["NamaOperator"] ?? j["namaOperator"]),
    enable: asBool(j["Enable"] ?? j["enable"], true),
  };
}

export async function fetchOperatorsByRegu(
  token: string | undefined,
  idRegu: number,
): Promise<MstOperator[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth(
    `/mst-operator/regu/${idRegu}`,
    t,
  );
  return rowsOf(res).map(parseOperator);
}

export async function fetchAllOperators(
  token: string | undefined,
): Promise<MstOperator[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth("/mst-operator", t);
  return rowsOf(res).map(parseOperator);
}

// ── Shift hour ───────────────────────────────────────────────────────────────

export async function fetchShiftHour(
  token: string | undefined,
  tanggal: string,
  shift: number,
): Promise<ShiftHour | null> {
  return fetchShiftHourAt(token, "/mst/shift/hour", tanggal, shift);
}

/** Shift hour khusus mixer — tablet: /api/mst/mixer/shift/hour */
export async function fetchMixerShiftHour(
  token: string | undefined,
  tanggal: string,
  shift: number,
): Promise<ShiftHour | null> {
  return fetchShiftHourAt(token, "/mst/mixer/shift/hour", tanggal, shift);
}

/** Shift hour khusus gilingan — tablet: /api/mst/gilingan/shift/hour */
export async function fetchGilinganShiftHour(
  token: string | undefined,
  tanggal: string,
  shift: number,
): Promise<ShiftHour | null> {
  return fetchShiftHourAt(token, "/mst/gilingan/shift/hour", tanggal, shift);
}

async function fetchShiftHourAt(
  token: string | undefined,
  path: string,
  tanggal: string,
  shift: number,
): Promise<ShiftHour | null> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ success?: boolean; data?: Record<string, unknown> }>(
    `${path}?tanggal=${encodeURIComponent(tanggal)}&shift=${shift}`,
    t,
  );
  const row = res.data.data;
  if (!row) return null;
  return {
    tanggal: asString(row["tanggal"]) || tanggal,
    shift: asInt(row["shift"], shift),
    hourStart: asTimeHHmm(row["hourStart"]),
    hourEnd: asTimeHHmm(row["hourEnd"]),
  };
}

// ── Overlap ──────────────────────────────────────────────────────────────────

export async function checkWashingOverlap(
  token: string | undefined,
  params: {
    date: string;
    idMesin: number;
    start: string;
    end: string;
    exclude?: string;
  },
): Promise<OverlapResult> {
  return checkOverlap(token, "washing", params);
}

export async function checkCrusherOverlap(
  token: string | undefined,
  params: {
    date: string;
    idMesin: number;
    start: string;
    end: string;
    exclude?: string;
  },
): Promise<OverlapResult> {
  return checkOverlap(token, "crusher", params);
}

export async function checkBrokerOverlap(
  token: string | undefined,
  params: {
    date: string;
    idMesin: number;
    start: string;
    end: string;
    exclude?: string;
  },
): Promise<OverlapResult> {
  return checkOverlap(token, "broker", params);
}

export async function checkMixerOverlap(
  token: string | undefined,
  params: {
    date: string;
    idMesin: number;
    start: string;
    end: string;
    exclude?: string;
  },
): Promise<OverlapResult> {
  return checkOverlap(token, "mixer", params);
}

export async function checkGilinganOverlap(
  token: string | undefined,
  params: {
    date: string;
    idMesin: number;
    start: string;
    end: string;
    exclude?: string;
  },
): Promise<OverlapResult> {
  return checkOverlap(token, "gilingan", params);
}

async function checkOverlap(
  token: string | undefined,
  kind: "washing" | "crusher" | "broker" | "mixer" | "gilingan",
  params: {
    date: string;
    idMesin: number;
    start: string;
    end: string;
    exclude?: string;
  },
): Promise<OverlapResult> {
  const t = requireToken(token);
  const qs = new URLSearchParams({
    date: params.date,
    idMesin: String(params.idMesin),
    start: params.start,
    end: params.end,
  });
  if (params.exclude) qs.set("exclude", params.exclude);
  const res = await apiFetchAuth<{
    success?: boolean;
    isOverlap?: boolean;
    conflicts?: unknown[];
  }>(`/production/${kind}/overlap?${qs.toString()}`, t);
  const raw = Array.isArray(res.data.conflicts)
    ? (res.data.conflicts as Record<string, unknown>[])
    : [];
  const conflicts = raw.map((c) => ({
    ...c,
    noProduksi: String(
      c["noProduksi"] ??
        c["NoProduksi"] ??
        c["NoDoc"] ??
        c["noDoc"] ??
        c["NoCrusherProduksi"] ??
        "",
    ),
    hourStart: String(c["HourStart"] ?? c["hourStart"] ?? ""),
    hourEnd: String(c["HourEnd"] ?? c["hourEnd"] ?? ""),
  })) as OverlapResult["conflicts"];
  return { isOverlap: Boolean(res.data.isOverlap), conflicts };
}
