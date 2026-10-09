import { ApiRequestError, apiFetchAuth, getBackendBaseUrl } from "@/services/api";

export type LbHeader = {
  NoBahanBaku: string;
  IdSupplier: number | null;
  NamaSupplier: string | null;
  NoPlat: string | null;
  DateCreate: string | null;
  CreateBy: string | null;
  Used: boolean;
};

export type LbPallet = {
  NoBahanBaku: string;
  NoPallet: string;
  IdJenisPlastik: number | null;
  NamaJenisPlastik: string | null;
  IdWarehouse: number | null;
  IdStatus: number | null;
  Keterangan: string | null;
  StatusText: string;
  Moisture: number | null;
  MeltingIndex: number | null;
  Elasticity: number | null;
  Tenggelam: number | null;
  Density: number | null;
  Density2: number | null;
  Density3: number | null;
  HasBeenPrinted: number;
  Blok: string | null;
  IdLokasi: string | null;
  SakActual: number;
  SakSisa: number;
  BeratActual: number;
  BeratSisa: number;
  IsEmpty: boolean;
};

export type LbDetail = {
  NoSak: number;
  Berat: number;
  BeratAct: number | null;
  DateUsage: string | null;
  IsLembab: boolean;
  IsPartial: boolean;
};

export type LbPrintLock = {
  noLabel: string;
  lockedBy?: number | string | null;
  username?: string | null;
  lockedAt?: string;
  expiresAt?: string;
  remainingMs?: number;
};

export type LbQcHeader = {
  IdJenisPlastik: number | null;
  IdWarehouse: number | null;
  IdStatus: number | null;
  Keterangan: string | null;
  Tenggelam: number | null;
  Density: number | null;
  Density2: number | null;
  Density3: number | null;
  Moisture: number | null;
  MeltingIndex: number | null;
  Elasticity: number | null;
};

type Envelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  meta?: { page?: number; limit?: number; total?: number; totalPages?: number };
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

export async function getLbHeaders(
  token: string | undefined,
  args: { page: number; limit: number; search: string; includeUsed: boolean },
): Promise<{ headers: LbHeader[]; total: number; totalPages: number }> {
  const t = requireToken(token);
  const qs = new URLSearchParams({
    page: String(args.page),
    limit: String(args.limit),
  });
  if (args.search) qs.set("search", args.search);
  if (args.includeUsed) qs.set("includeUsed", "true");
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>(
    `/labels/bahan-baku?${qs.toString()}`,
    t,
  );
  if (res.status !== 200 || !res.data || res.data.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat data (${res.status})`);
  }
  const headers = (res.data.data ?? []).map((r) => ({
    NoBahanBaku: str(r.NoBahanBaku),
    IdSupplier: numOrNull(r.IdSupplier),
    NamaSupplier: strOrNull(r.NamaSupplier),
    NoPlat: strOrNull(r.NoPlat),
    DateCreate: strOrNull(r.DateCreate),
    CreateBy: strOrNull(r.CreateBy),
    Used: bool(r.Used),
  }));
  return {
    headers,
    total: res.data.meta?.total ?? headers.length,
    totalPages: res.data.meta?.totalPages ?? 1,
  };
}

export async function getLbPallets(
  token: string | undefined,
  noBahanBaku: string,
): Promise<LbPallet[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<{ pallets?: Record<string, unknown>[] }>>(
    `/labels/bahan-baku/${encodeURIComponent(noBahanBaku)}/pallet`,
    t,
  );
  if (res.status === 404) return [];
  if (res.status !== 200 || !res.data || res.data.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat pallet (${res.status})`);
  }
  return (res.data.data?.pallets ?? []).map((r) => ({
    NoBahanBaku: str(r.NoBahanBaku) || noBahanBaku,
    NoPallet: str(r.NoPallet),
    IdJenisPlastik: numOrNull(r.IdJenisPlastik),
    NamaJenisPlastik: strOrNull(r.NamaJenisPlastik),
    IdWarehouse: numOrNull(r.IdWarehouse),
    IdStatus: numOrNull(r.IdStatus),
    Keterangan: strOrNull(r.Keterangan),
    StatusText: str(r.StatusText),
    Moisture: numOrNull(r.Moisture),
    MeltingIndex: numOrNull(r.MeltingIndex),
    Elasticity: numOrNull(r.Elasticity),
    Tenggelam: numOrNull(r.Tenggelam),
    Density: numOrNull(r.Density),
    Density2: numOrNull(r.Density2),
    Density3: numOrNull(r.Density3),
    HasBeenPrinted: num0(r.HasBeenPrinted),
    Blok: strOrNull(r.Blok),
    IdLokasi: strOrNull(r.IdLokasi),
    SakActual: num0(r.SakActual),
    SakSisa: num0(r.SakSisa),
    BeratActual: num0(r.BeratActual),
    BeratSisa: num0(r.BeratSisa),
    IsEmpty: bool(r.IsEmpty),
  }));
}

export async function getLbDetails(
  token: string | undefined,
  noBahanBaku: string,
  noPallet: string,
): Promise<LbDetail[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<{ details?: Record<string, unknown>[] }>>(
    `/labels/bahan-baku/${encodeURIComponent(noBahanBaku)}/pallet/${encodeURIComponent(noPallet)}`,
    t,
  );
  if (res.status === 404) return [];
  if (res.status !== 200 || !res.data || res.data.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat detail sak (${res.status})`);
  }
  return (res.data.data?.details ?? []).map((r) => ({
    NoSak: num0(r.NoSak),
    Berat: num0(r.Berat),
    BeratAct: numOrNull(r.BeratAct),
    DateUsage: strOrNull(r.DateUsage),
    IsLembab: bool(r.IsLembab),
    IsPartial: bool(r.IsPartial),
  }));
}

export async function getLbPrintLocks(token: string | undefined): Promise<LbPrintLock[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<LbPrintLock[]>>("/labels/print-locks", t);
  if (res.status !== 200 || !res.data || res.data.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat status lock (${res.status})`);
  }
  return res.data.data ?? [];
}

export async function updateLbPalletQc(
  token: string | undefined,
  noBahanBaku: string,
  noPallet: string,
  header: LbQcHeader,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<unknown>>(
    `/labels/bahan-baku/${encodeURIComponent(noBahanBaku)}/pallet/${encodeURIComponent(noPallet)}`,
    t,
    { method: "PUT", body: JSON.stringify({ header }) },
  );
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal menyimpan QC (${res.status})`);
  }
}

export async function acquireLbPrintLock(
  token: string | undefined,
  noLabel: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<unknown>>(
    `/labels/${encodeURIComponent(noLabel)}/print-lock`,
    t,
    { method: "POST" },
  );
  if (res.status < 200 || res.status >= 300) {
    const lockedBy = (res.data as { lockedBy?: string } | null)?.lockedBy;
    const base = res.data?.message ?? `Gagal lock cetak (${res.status})`;
    throw new ApiRequestError(lockedBy ? `${base} — ${lockedBy}` : base);
  }
}

export async function releaseLbPrintLock(
  token: string | undefined,
  noLabel: string,
): Promise<void> {
  const t = requireToken(token);
  try {
    await apiFetchAuth(`/labels/${encodeURIComponent(noLabel)}/print-lock`, t, {
      method: "DELETE",
    });
  } catch {
    // release best-effort
  }
}

export async function fetchLbLabelPdfBase64(
  token: string | undefined,
  noBahanBaku: string,
  noPallet: string,
): Promise<string> {
  const t = requireToken(token);
  const base = getBackendBaseUrl();
  const path = `/labels/bahan-baku/${encodeURIComponent(noBahanBaku)}/pallet/${encodeURIComponent(noPallet)}/pdf`;
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

export async function markLbPrinted(
  token: string | undefined,
  noBahanBaku: string,
  noPallet: string,
): Promise<number | null> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>>>(
    `/labels/bahan-baku/${encodeURIComponent(noBahanBaku)}/pallet/${encodeURIComponent(noPallet)}/print`,
    t,
    { method: "PATCH" },
  );
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memperbarui hitungan cetak (${res.status})`);
  }
  const raw = res.data.data?.HasBeenPrinted ?? res.data.data?.hasBeenPrinted;
  const n = numOrNull(raw);
  return n;
}
