import { ApiRequestError, apiFetchAuth, getBackendBaseUrl } from "@/services/api";

export type LrjMode =
  | "inject"
  | "hotStamping"
  | "pasangKunci"
  | "spanner"
  | "bjSortir";

export type LrjHeader = {
  NoReject: string;
  DateCreate: string | null;
  IdReject: number;
  NamaReject: string | null;
  Berat: number | null;
  IsPartial: boolean;
  IdWarehouse: number | null;
  Blok: string | null;
  IdLokasi: string | null;
  OutputType: string | null;
  OutputCode: string | null;
  OutputNamaMesin: string | null;
  HasBeenPrinted: number;
  Used: boolean;
};

export type LrjOutputItem = {
  NoReject: string;
  HasBeenPrinted: number;
};

export type LrjJenis = {
  IdReject: number;
  NamaReject: string;
  ItemCode: string | null;
};

export type LrjProcessOption = {
  code: string;
  nama: string;
};

export type LrjPartialRow = {
  NoRejectPartial: string;
  NoReject: string;
  Berat: number;
  SourceType: string | null;
  NoProduksi: string | null;
  TanggalProduksi: string | null;
  IdMesin: number | null;
  NamaMesin: string | null;
  JamProduksi: string | null;
  Shift: number | null;
};

export type LrjPartialInfo = {
  totalPartialBerat: number;
  rows: LrjPartialRow[];
};

type Envelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  totalPartialBerat?: number;
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

function parseHeader(r: Record<string, unknown>): LrjHeader {
  return {
    NoReject: str(r.NoReject),
    DateCreate: strOrNull(r.DateCreate),
    IdReject: num0(r.IdReject),
    NamaReject: strOrNull(r.NamaReject),
    Berat: numOrNull(r.Berat),
    IsPartial: bool(r.IsPartial),
    IdWarehouse: numOrNull(r.IdWarehouse),
    Blok: strOrNull(r.Blok),
    IdLokasi: strOrNull(r.IdLokasi),
    OutputType: strOrNull(r.OutputType),
    OutputCode: strOrNull(r.OutputCode),
    OutputNamaMesin: strOrNull(r.OutputNamaMesin),
    HasBeenPrinted: num0(r.HasBeenPrinted),
    Used: bool(r.Used),
  };
}

export async function getLrjHeaders(
  token: string | undefined,
  args: { page: number; limit: number; search: string; includeUsed: boolean },
): Promise<{ headers: LrjHeader[]; total: number; totalPages: number }> {
  const t = requireToken(token);
  const qs = new URLSearchParams({
    page: String(args.page),
    limit: String(args.limit),
  });
  if (args.search) qs.set("search", args.search);
  if (args.includeUsed) qs.set("includeUsed", "true");
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>(
    `/labels/reject?${qs.toString()}`,
    t,
  );
  if (res.status !== 200 || !res.data || res.data.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat data (${res.status})`);
  }
  const raw = res.data.data;
  const arr = Array.isArray(raw) ? raw : raw ? [raw as Record<string, unknown>] : [];
  const headers = arr.map((r) => parseHeader(r));
  return {
    headers,
    total: res.data.meta?.total ?? headers.length,
    totalPages: res.data.meta?.totalPages ?? 1,
  };
}

export async function getLrjJenis(token: string | undefined): Promise<LrjJenis[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ data?: Record<string, unknown>[] }>(
    "/reject-type",
    t,
  );
  return (res.data.data ?? [])
    .filter((r) => r.Enable === 1 || r.Enable === true || r.Enable == null)
    .map((r) => ({
      IdReject: num0(r.IdReject),
      NamaReject: str(r.NamaReject),
      ItemCode: strOrNull(r.ItemCode),
    }))
    .filter((j) => j.IdReject > 0);
}

export function lrjJenisLabel(j: LrjJenis): string {
  const code = (j.ItemCode ?? "").trim();
  if (!code) return j.NamaReject;
  return `${code} | ${j.NamaReject}`;
}

export function lrjModePrefix(mode: LrjMode): string {
  switch (mode) {
    case "inject":
      return "S.";
    case "hotStamping":
      return "BH.";
    case "pasangKunci":
      return "BI.";
    case "spanner":
      return "BJ.";
    case "bjSortir":
      return "J.";
  }
}

export function lrjModeLabel(mode: LrjMode): string {
  switch (mode) {
    case "inject":
      return "Inject (S.)";
    case "hotStamping":
      return "Hot Stamping (BH.)";
    case "pasangKunci":
      return "Pasang Kunci (BI.)";
    case "spanner":
      return "Spanner (BJ.)";
    case "bjSortir":
      return "BJ Sortir (J.)";
  }
}

function parseOptionsFromList(
  data: Record<string, unknown>[],
  noField: string,
  namaField: string,
): LrjProcessOption[] {
  return data
    .map((p) => ({
      code: str(p[noField]),
      nama: str(p[namaField]),
    }))
    .filter((o) => o.code !== "");
}

export async function getLrjProduksiOptions(
  token: string | undefined,
  args: { tanggal: string; mode: LrjMode },
): Promise<LrjProcessOption[]> {
  const t = requireToken(token);
  const { tanggal, mode } = args;

  if (mode === "bjSortir") {
    const res = await apiFetchAuth<{ data?: Record<string, unknown>[] }>(
      `/production/sortir-reject/${encodeURIComponent(tanggal)}`,
      t,
    );
    return parseOptionsFromList(res.data.data ?? [], "NoBJSortir", "NoBJSortir").map(
      (o) => ({ ...o, nama: "BJ Sortir" }),
    );
  }

  const qs = new URLSearchParams({
    page: "1",
    pageSize: "100",
    tanggal,
  });
  const path =
    mode === "inject"
      ? "/production/inject"
      : mode === "hotStamping"
        ? "/production/hot-stamp"
        : mode === "pasangKunci"
          ? "/production/key-fitting"
          : "/production/spanner";
  const res = await apiFetchAuth<{ data?: Record<string, unknown>[] }>(
    `${path}?${qs.toString()}`,
    t,
  );
  return parseOptionsFromList(res.data.data ?? [], "NoProduksi", "NamaMesin");
}

export async function getLrjOutputs(
  token: string | undefined,
  args: { noCode: string; mode: LrjMode },
): Promise<LrjOutputItem[]> {
  const t = requireToken(token);
  const path =
    args.mode === "inject"
      ? `/production/inject/${encodeURIComponent(args.noCode)}/outputs/reject`
      : args.mode === "hotStamping"
        ? `/production/hot-stamp/${encodeURIComponent(args.noCode)}/outputs/reject`
        : args.mode === "pasangKunci"
          ? `/production/key-fitting/${encodeURIComponent(args.noCode)}/outputs/reject`
          : args.mode === "spanner"
            ? `/production/spanner/${encodeURIComponent(args.noCode)}/outputs/reject`
            : `/production/sortir-reject/${encodeURIComponent(args.noCode)}/outputs/reject`;
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>(path, t);
  if (res.status !== 200 || !res.data) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat output (${res.status})`);
  }
  const raw = res.data.data;
  const arr = Array.isArray(raw) ? raw : raw ? [raw as Record<string, unknown>] : [];
  return arr
    .map((r) => ({
      NoReject: str(r.NoReject),
      HasBeenPrinted: num0(r.HasBeenPrinted),
    }))
    .filter((o) => o.NoReject !== "");
}

export async function getLrjPartialInfo(
  token: string | undefined,
  noReject: string,
): Promise<LrjPartialInfo> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>(
    `/labels/reject/partials/${encodeURIComponent(noReject)}`,
    t,
  );
  if (res.status !== 200 || !res.data || res.data.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat partial (${res.status})`);
  }
  return {
    totalPartialBerat: numOrNull(res.data.totalPartialBerat) ?? 0,
    rows: (res.data.data ?? []).map((r) => ({
      NoRejectPartial: str(r.NoRejectPartial),
      NoReject: str(r.NoReject),
      Berat: num0(r.Berat),
      SourceType: strOrNull(r.SourceType),
      NoProduksi: strOrNull(r.NoProduksi),
      TanggalProduksi: strOrNull(r.TanggalProduksi),
      IdMesin: numOrNull(r.IdMesin),
      NamaMesin: strOrNull(r.NamaMesin),
      JamProduksi: strOrNull(r.JamProduksi),
      Shift: numOrNull(r.Shift),
    })),
  };
}

export type LrjHeaderPayload = Partial<{
  IdReject: number;
  Berat: number;
  DateCreate: string;
  Jam: string;
  IsPartial: 0 | 1;
  IdWarehouse: number;
  Blok: string;
  IdLokasi: string;
}>;

export type LrjSavePayload = {
  header: LrjHeaderPayload;
  /** Wajib saat create — S. / BH. / BI. / BJ. / J. */
  outputCode?: string;
};

export async function createLrj(
  token: string | undefined,
  payload: LrjSavePayload,
): Promise<{ noReject: string | null; count: number }> {
  const t = requireToken(token);
  const res = await apiFetchAuth<
    Envelope<{
      headers?: Record<string, unknown>[];
      header?: Record<string, unknown>;
      output?: { count?: number };
    }>
  >("/labels/reject", t, { method: "POST", body: JSON.stringify(payload) });
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal membuat label (${res.status})`);
  }
  const headers = Array.isArray(res.data.data?.headers) ? res.data.data!.headers! : [];
  const count =
    typeof res.data.data?.output?.count === "number"
      ? res.data.data!.output!.count!
      : headers.length || 1;
  const firstNo = headers[0]?.NoReject ?? res.data.data?.header?.NoReject ?? null;
  return { noReject: firstNo != null ? str(firstNo) : null, count };
}

export async function updateLrj(
  token: string | undefined,
  noReject: string,
  payload: LrjSavePayload,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<unknown>>(
    `/labels/reject/${encodeURIComponent(noReject)}`,
    t,
    { method: "PUT", body: JSON.stringify(payload) },
  );
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal menyimpan label (${res.status})`);
  }
}

export async function deleteLrj(
  token: string | undefined,
  noReject: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<unknown>>(
    `/labels/reject/${encodeURIComponent(noReject)}`,
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

export async function fetchLrjLabelPdfBase64(
  token: string | undefined,
  noReject: string,
): Promise<string> {
  return fetchPdfBase64(
    requireToken(token),
    `/labels/reject/${encodeURIComponent(noReject)}/pdf`,
  );
}

export async function markLrjPrinted(
  token: string | undefined,
  noReject: string,
): Promise<number | null> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>>>(
    `/labels/reject/${encodeURIComponent(noReject)}/print`,
    t,
    { method: "PATCH" },
  );
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(
      res.data?.message ?? `Gagal memperbarui hitungan cetak (${res.status})`,
    );
  }
  return numOrNull(res.data.data?.HasBeenPrinted ?? res.data.data?.hasBeenPrinted);
}

export async function resetLrjPrinted(
  token: string | undefined,
  noReject: string,
): Promise<number | null> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>>>(
    `/labels/reject/${encodeURIComponent(noReject)}/reset-print`,
    t,
    { method: "PATCH" },
  );
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal reset status cetak (${res.status})`);
  }
  return numOrNull(res.data.data?.HasBeenPrinted ?? res.data.data?.hasBeenPrinted);
}
