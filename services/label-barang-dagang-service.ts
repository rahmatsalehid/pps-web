import { ApiRequestError, apiFetchAuth, getBackendBaseUrl } from "@/services/api";

export type LbdHeader = {
  NoBarangDagang: string;
  IdSupplier: number | null;
  NamaSupplier: string | null;
  IdBarangDagang: number | null;
  NamaBarangDagang: string | null;
  Qty: number | null;
  Keterangan: string | null;
  IsPartial: boolean;
  Used: boolean;
  HasBeenPrinted: number;
  Blok: string | null;
  IdLokasi: string | null;
  NoPenerimaan: string | null;
};

export type LbdJenis = {
  IdBarangDagang: number;
  NamaBarangDagang: string;
};

export type LbdSupplier = {
  IdSupplier: number;
  NamaSupplier: string;
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

function parseHeader(r: Record<string, unknown>): LbdHeader {
  return {
    NoBarangDagang: str(r.NoBarangDagang),
    IdSupplier: numOrNull(r.IdSupplier),
    NamaSupplier: strOrNull(r.NamaSupplier),
    IdBarangDagang: numOrNull(r.IdBarangDagang),
    NamaBarangDagang: strOrNull(r.NamaBarangDagang),
    Qty: numOrNull(r.Qty),
    Keterangan: strOrNull(r.Keterangan),
    IsPartial: bool(r.IsPartial),
    Used: bool(r.Used),
    HasBeenPrinted: num0(r.HasBeenPrinted),
    Blok: strOrNull(r.Blok),
    IdLokasi: strOrNull(r.IdLokasi),
    NoPenerimaan: strOrNull(r.NoPenerimaan),
  };
}

export async function getLbdHeaders(
  token: string | undefined,
  args: { page: number; limit: number; search: string; includeUsed: boolean },
): Promise<{ headers: LbdHeader[]; total: number; totalPages: number }> {
  const t = requireToken(token);
  const qs = new URLSearchParams({
    page: String(args.page),
    limit: String(args.limit),
  });
  if (args.search) qs.set("search", args.search);
  if (args.includeUsed) qs.set("includeUsed", "true");
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>(
    `/labels/barang-dagang?${qs.toString()}`,
    t,
  );
  if (res.status !== 200 || !res.data || res.data.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat data (${res.status})`);
  }
  const headers = (res.data.data ?? []).map((r) => parseHeader(r));
  return {
    headers,
    total: res.data.meta?.total ?? headers.length,
    totalPages: res.data.meta?.totalPages ?? 1,
  };
}

export async function getLbdJenis(token: string | undefined): Promise<LbdJenis[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>("/mst-barang-dagang", t);
  if (res.status !== 200 || !res.data || res.data.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat jenis barang dagang (${res.status})`);
  }
  return (res.data.data ?? [])
    .filter((r) => r.Enable === undefined || r.Enable === 1 || r.Enable === true)
    .map((r) => ({
      IdBarangDagang: num0(r.IdBarangDagang),
      NamaBarangDagang: str(r.NamaBarangDagang),
    }));
}

export async function getLbdSuppliers(token: string | undefined): Promise<LbdSupplier[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>(
    "/mst/supplier?orderBy=NmSupplier&orderDir=ASC",
    t,
  );
  if (res.status !== 200 || !res.data || res.data.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat data supplier (${res.status})`);
  }
  return (res.data.data ?? []).map((r) => ({
    IdSupplier: num0(r.IdSupplier ?? r.idSupplier),
    NamaSupplier: str(r.NmSupplier ?? r.NamaSupplier ?? r.namaSupplier),
  }));
}

export type LbdHeaderPayload = Partial<{
  IdSupplier: number;
  IdBarangDagang: number;
  Qty: number;
  Keterangan: string | null;
  Blok: string | null;
  IdLokasi: string | null;
}>;

export type LbdSavePayload = {
  header: LbdHeaderPayload;
};

export async function updateLbd(
  token: string | undefined,
  noBarangDagang: string,
  payload: LbdSavePayload,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<unknown>>(
    `/labels/barang-dagang/${encodeURIComponent(noBarangDagang)}`,
    t,
    { method: "PUT", body: JSON.stringify(payload) },
  );
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal menyimpan label (${res.status})`);
  }
}

export async function deleteLbd(
  token: string | undefined,
  noBarangDagang: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<unknown>>(
    `/labels/barang-dagang/${encodeURIComponent(noBarangDagang)}`,
    t,
    { method: "DELETE" },
  );
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal menghapus label (${res.status})`);
  }
}

async function fetchPdfBase64(token: string, path: string): Promise<string> {
  const base = getBackendBaseUrl();
  let response: Response;
  try {
    response = await fetch(`${base}/api${path}`, {
      headers: { Authorization: `Bearer ${token}` },
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

export async function fetchLbdLabelPdfBase64(
  token: string | undefined,
  noBarangDagang: string,
): Promise<string> {
  return fetchPdfBase64(
    requireToken(token),
    `/labels/barang-dagang/${encodeURIComponent(noBarangDagang)}/pdf`,
  );
}

export async function markLbdPrinted(
  token: string | undefined,
  noBarangDagang: string,
): Promise<number | null> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>>>(
    `/labels/barang-dagang/${encodeURIComponent(noBarangDagang)}/print`,
    t,
    { method: "PATCH" },
  );
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memperbarui hitungan cetak (${res.status})`);
  }
  return numOrNull(res.data.data?.HasBeenPrinted ?? res.data.data?.hasBeenPrinted);
}
