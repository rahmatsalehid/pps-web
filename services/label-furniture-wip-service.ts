import { ApiRequestError, apiFetchAuth, getBackendBaseUrl } from "@/services/api";

export type LfwSourceMode = "INJECT" | "HOTSTAMP" | "KEYFITTING" | "SPANNER" | "RETUR";

export type LfwHeader = {
  NoFurnitureWIP: string;
  DateCreate: string | null;
  IdFurnitureWIP: number;
  NamaFurnitureWIP: string | null;
  Pcs: number | null;
  Berat: number | null;
  IsPartial: boolean;
  Used: boolean;
  HasBeenPrinted: number;
  IdWarna: number | null;
  Blok: string | null;
  IdLokasi: string | null;
  OutputType: string | null;
  OutputCode: string | null;
  OutputNamaMesin: string | null;
};

export type LfwOutputItem = {
  NoFurnitureWIP: string;
  HasBeenPrinted: number;
};

export type LfwJenis = {
  IdCabinetWIP: number;
  Nama: string;
};

export type LfwProcessOption = {
  noProduksi: string;
  namaMesin: string;
};

export type LfwPartialRow = {
  NoFurnitureWIPPartial: string;
  NoFurnitureWIP: string;
  Pcs: number | null;
  SourceType: string | null;
  NoProduksi: string | null;
  TglProduksi: string | null;
  NamaMesin: string | null;
};

export type LfwPartialInfo = {
  totalPartialPcs: number;
  rows: LfwPartialRow[];
};

export type LfwInjectCandidate = {
  IdFurnitureWIP: number;
  NamaFurnitureWIP: string;
  BeratProdukHasilTimbang: number | null;
};

type Envelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  meta?: { page?: number; limit?: number; total?: number; totalPages?: number };
  totalRows?: number;
  totalPartialPcs?: number;
};

function requireToken(token: string | undefined): string {
  if (!token) throw new ApiRequestError("Sesi login berakhir, silakan login ulang");
  return token;
}

const numOrNull = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const num0 = (v: unknown): number => numOrNull(v) ?? 0;
const bool = (v: unknown): boolean => v === true || v === 1 || v === "1";
const str = (v: unknown): string => (v == null ? "" : String(v));
const strOrNull = (v: unknown): string | null => (v == null ? null : String(v));

const SOURCE_PREFIX: Record<LfwSourceMode, string> = {
  INJECT: "S.",
  HOTSTAMP: "BH.",
  KEYFITTING: "BI.",
  SPANNER: "BJ.",
  RETUR: "L.",
};

export function buildOutputCode(mode: LfwSourceMode, noProduksi: string): string {
  const no = noProduksi.trim();
  if (no.startsWith(SOURCE_PREFIX[mode])) return no;
  return SOURCE_PREFIX[mode] + no.replace(/^[A-Z]{1,2}\./, "");
}

export function isFromBongkarSusun(outputCode: string | null): boolean {
  return (outputCode ?? "").trim().startsWith("BG.");
}

export async function getLfwHeaders(
  token: string | undefined,
  args: { page: number; limit: number; search: string; includeUsed: boolean },
): Promise<{ headers: LfwHeader[]; total: number; totalPages: number }> {
  const t = requireToken(token);
  const qs = new URLSearchParams({
    page: String(args.page),
    limit: String(args.limit),
  });
  if (args.search) qs.set("search", args.search);
  if (args.includeUsed) qs.set("includeUsed", "true");
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>(
    `/labels/furniture-wip?${qs.toString()}`,
    t,
  );
  if (res.status !== 200 || !res.data || res.data.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat data (${res.status})`);
  }
  const headers = (res.data.data ?? []).map((r) => ({
    NoFurnitureWIP: str(r.NoFurnitureWIP),
    DateCreate: strOrNull(r.DateCreate),
    IdFurnitureWIP: num0(r.IdFurnitureWIP),
    NamaFurnitureWIP: strOrNull(r.NamaFurnitureWIP),
    Pcs: numOrNull(r.Pcs),
    Berat: numOrNull(r.Berat),
    IsPartial: bool(r.IsPartial),
    Used: bool(r.Used),
    HasBeenPrinted: num0(r.HasBeenPrinted),
    IdWarna: numOrNull(r.IdWarna),
    Blok: strOrNull(r.Blok),
    IdLokasi: strOrNull(r.IdLokasi),
    OutputType: strOrNull(r.OutputType),
    OutputCode: strOrNull(r.OutputCode),
    OutputNamaMesin: strOrNull(r.OutputNamaMesin),
  }));
  return {
    headers,
    total: res.data.meta?.total ?? headers.length,
    totalPages: res.data.meta?.totalPages ?? 1,
  };
}

export async function getLfwJenis(token: string | undefined): Promise<LfwJenis[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>(
    "/furniture-wip-type",
    t,
  );
  if (res.status !== 200 || !res.data || res.data.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat jenis furniture WIP (${res.status})`);
  }
  return (res.data.data ?? [])
    .map((r) => ({
      IdCabinetWIP: num0(r.IdCabinetWIP ?? r.IdFurnitureWIP),
      Nama: str(r.Nama ?? r.NamaFurnitureWIP),
    }))
    .filter((j) => j.IdCabinetWIP !== 0);
}

export async function getLfwInjectCandidates(
  token: string | undefined,
  noProduksi: string,
): Promise<{ candidates: LfwInjectCandidate[]; beratTimbang: number | null }> {
  const t = requireToken(token);
  const res = await apiFetchAuth<
    Envelope<Record<string, unknown> | Record<string, unknown>[]>
  >( `/production/inject/furniture-wip/${encodeURIComponent(noProduksi)}`, t);
  if (res.status !== 200 || !res.data) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat kandidat jenis inject (${res.status})`);
  }
  const raw = res.data.data;
  const obj = raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : null;
  const rows: Record<string, unknown>[] = Array.isArray(raw)
    ? raw
    : obj && Array.isArray(obj.items)
      ? (obj.items as Record<string, unknown>[])
      : [];
  const beratTimbang =
    obj != null ? numOrNull(obj.beratProdukHasilTimbang ?? obj.BeratProdukHasilTimbang) : null;
  return {
    candidates: rows.map((r) => ({
      IdFurnitureWIP: num0(r.IdFurnitureWIP),
      NamaFurnitureWIP: str(r.NamaFurnitureWIP),
      BeratProdukHasilTimbang: numOrNull(r.BeratProdukHasilTimbang),
    })),
    beratTimbang,
  };
}

export async function getLfwOutputs(
  token: string | undefined,
  mode: LfwSourceMode,
  noProduksi: string,
): Promise<LfwOutputItem[]> {
  const t = requireToken(token);
  const no = encodeURIComponent(noProduksi);
  const pathByMode: Record<LfwSourceMode, string> = {
    INJECT: `/production/inject/${no}/outputs/furniture-wip`,
    HOTSTAMP: `/production/hot-stamp/${no}/outputs/furniture-wip`,
    KEYFITTING: `/production/key-fitting/${no}/outputs/furniture-wip`,
    SPANNER: `/production/spanner/${no}/outputs/furniture-wip`,
    RETUR: `/production/return/${no}/outputs/furniture-wip`,
  };
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>(
    pathByMode[mode],
    t,
  );
  if (res.status !== 200 || !res.data) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat output (${res.status})`);
  }
  return (res.data.data ?? [])
    .map((r) => ({
      NoFurnitureWIP: str(r.NoFurnitureWIP ?? r.Label),
      HasBeenPrinted: num0(r.HasBeenPrinted),
    }))
    .filter((o) => o.NoFurnitureWIP !== "");
}

export async function getLfwPartialInfo(
  token: string | undefined,
  noFurnitureWip: string,
): Promise<LfwPartialInfo> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>(
    `/labels/furniture-wip/partials/${encodeURIComponent(noFurnitureWip)}`,
    t,
  );
  if (res.status !== 200 || !res.data || res.data.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat info partial (${res.status})`);
  }
  return {
    totalPartialPcs: num0(res.data.totalPartialPcs),
    rows: (res.data.data ?? []).map((r) => ({
      NoFurnitureWIPPartial: str(r.NoFurnitureWIPPartial),
      NoFurnitureWIP: str(r.NoFurnitureWIP),
      Pcs: numOrNull(r.Pcs),
      SourceType: strOrNull(r.SourceType),
      NoProduksi: strOrNull(r.NoProduksi),
      TglProduksi: strOrNull(r.TglProduksi),
      NamaMesin: strOrNull(r.NamaMesin),
    })),
  };
}

export async function createLfw(
  token: string | undefined,
  body: {
    header: {
      IdFurnitureWIP?: number;
      Pcs: number;
      Berat?: number | null;
      DateCreate: string;
      IsPartial?: number;
    };
    outputCode: string;
  },
): Promise<string[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>>>(
    "/labels/furniture-wip",
    t,
    { method: "POST", body: JSON.stringify(body) },
  );
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal membuat label (${res.status})`);
  }
  const data = res.data.data;
  const headersRaw = data?.headers;
  if (Array.isArray(headersRaw)) {
    return headersRaw
      .map((h) => str((h as Record<string, unknown>).NoFurnitureWIP))
      .filter((n) => n !== "");
  }
  const single = strOrNull(data?.NoFurnitureWIP);
  return single ? [single] : [];
}

export async function updateLfw(
  token: string | undefined,
  noFurnitureWip: string,
  body: {
    header: {
      DateCreate?: string;
      IdFurnitureWIP?: number;
      Pcs?: number;
      Berat?: number | null;
    };
    outputCode?: string | null;
  },
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<unknown>>(
    `/labels/furniture-wip/${encodeURIComponent(noFurnitureWip)}`,
    t,
    { method: "PUT", body: JSON.stringify(body) },
  );
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal menyimpan label (${res.status})`);
  }
}

export async function deleteLfw(token: string | undefined, noFurnitureWip: string): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<unknown>>(
    `/labels/furniture-wip/${encodeURIComponent(noFurnitureWip)}`,
    t,
    { method: "DELETE" },
  );
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal menghapus label (${res.status})`);
  }
}

export async function fetchLfwLabelPdfBase64(
  token: string | undefined,
  noFurnitureWip: string,
): Promise<string> {
  const t = requireToken(token);
  const base = getBackendBaseUrl();
  const path = `/labels/furniture-wip/${encodeURIComponent(noFurnitureWip)}/pdf`;
  let response: Response;
  try {
    response = await fetch(`${base}/api${path}`, {
      headers: { Authorization: `Bearer ${t}` },
      cache: "no-store",
    });
  } catch (e) {
    throw new ApiRequestError("Tidak dapat terhubung ke server", { cause: e });
  }
  if (!response.ok) {
    let message = `Gagal ambil PDF (${response.status})`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      /* ignore */
    }
    throw new ApiRequestError(message);
  }
  const buf = Buffer.from(await response.arrayBuffer());
  return buf.toString("base64");
}

export async function markLfwPrinted(
  token: string | undefined,
  noFurnitureWip: string,
): Promise<number | null> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>>>(
    `/labels/furniture-wip/${encodeURIComponent(noFurnitureWip)}/print`,
    t,
    { method: "PATCH" },
  );
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memperbarui hitungan cetak (${res.status})`);
  }
  return numOrNull(res.data.data?.HasBeenPrinted ?? res.data.data?.hasBeenPrinted);
}
