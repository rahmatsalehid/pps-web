import { apiFetchAuth, ApiRequestError } from "@/services/api";

export type LaporanColumn = {
  key: string;
  label: string;
};

export type LaporanData = {
  columns: LaporanColumn[];
  rows: Record<string, unknown>[];
  totalRows: number;
};

function requireToken(token: string | undefined): string {
  if (!token) throw new ApiRequestError("Tidak terautentikasi");
  return token;
}

function errMsg(
  data: { message?: string } | null,
  fallback: string,
): string {
  const m = data?.message?.trim();
  if (m && m !== "Internal Server Error") return m;
  return fallback;
}

export async function fetchWarehouseOptions(
  token: string | undefined,
): Promise<string[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    options?: string[];
  }>("/laporan/warehouse-options", t);
  if (res.status !== 200 || res.data?.success === false) {
    throw new ApiRequestError(errMsg(res.data, "Gagal memuat opsi warehouse"));
  }
  return Array.isArray(res.data?.options) ? res.data.options : [];
}

export async function fetchLaporan(
  token: string | undefined,
  endpoint: string,
  params: Record<string, string>,
): Promise<LaporanData> {
  const t = requireToken(token);
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== "") search.set(key, value);
  }
  const qs = search.toString();
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    columns?: LaporanColumn[];
    rows?: Record<string, unknown>[];
    totalRows?: number;
  }>(`${endpoint}${qs ? `?${qs}` : ""}`, t);
  if (res.status !== 200 || res.data?.success === false) {
    throw new ApiRequestError(errMsg(res.data, "Gagal memuat data laporan"));
  }
  return {
    columns: Array.isArray(res.data?.columns) ? res.data.columns : [],
    rows: Array.isArray(res.data?.rows) ? res.data.rows : [],
    totalRows: res.data?.totalRows ?? 0,
  };
}
