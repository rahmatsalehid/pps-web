"use server";

import { cookies } from "next/headers";
import { ApiRequestError } from "@/services/api";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import {
  acquireLbPrintLock,
  getLbPrintLocks,
  releaseLbPrintLock,
  type LbPrintLock,
} from "@/services/label-bahan-baku-service";
import {
  fetchInjectList,
  type InjectProduction,
} from "@/services/inject-service";
import {
  fetchStampingList,
  type StampingProduction,
} from "@/services/stamping-service";
import {
  fetchPasangKunciList,
  type PasangKunciProduction,
} from "@/services/pasang-kunci-service";
import {
  fetchSpannerList,
  type SpannerProduction,
} from "@/services/spanner-service";
import {
  fetchReturList,
  type ReturHeader,
} from "@/services/retur-v3-service";
import {
  createLfw,
  deleteLfw,
  fetchLfwLabelPdfBase64,
  getLfwHeaders,
  getLfwInjectCandidates,
  getLfwJenis,
  getLfwOutputs,
  getLfwPartialInfo,
  markLfwPrinted,
  updateLfw,
  type LfwHeader,
  type LfwInjectCandidate,
  type LfwJenis,
  type LfwOutputItem,
  type LfwPartialInfo,
  type LfwProcessOption,
  type LfwSourceMode,
} from "@/services/label-furniture-wip-service";

const PAGE_SIZE = 20;

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError || e instanceof Error) return e.message;
  return "Terjadi kesalahan";
}

export async function getLfwHeadersAction(args: {
  page: number;
  search: string;
  includeUsed: boolean;
}): Promise<
  | { ok: true; headers: LfwHeader[]; total: number; totalPages: number }
  | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const res = await getLfwHeaders(token, {
      page: args.page,
      limit: PAGE_SIZE,
      search: args.search,
      includeUsed: args.includeUsed,
    });
    return { ok: true, ...res };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLfwJenisAction(): Promise<
  { ok: true; jenis: LfwJenis[] } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const jenis = await getLfwJenis(token);
    return { ok: true, jenis };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

function toProcessOptions(
  items: Array<{
    noProduksi?: string | null;
    noRetur?: string | null;
    namaMesin?: string | null;
    namaPembeli?: string | null;
  }>,
): LfwProcessOption[] {
  return items
    .map((p) => ({
      noProduksi: (p.noProduksi ?? p.noRetur ?? "").trim(),
      namaMesin: (p.namaMesin ?? p.namaPembeli ?? "").trim(),
    }))
    .filter((o) => o.noProduksi !== "");
}

export async function getLfwProduksiOptionsAction(
  mode: LfwSourceMode,
  tanggal: string,
): Promise<
  { ok: true; options: LfwProcessOption[] } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    if (mode === "INJECT") {
      const res = await fetchInjectList(token, { page: 1, pageSize: 100, tanggal });
      return {
        ok: true,
        options: res.items.map((p: InjectProduction) => ({
          noProduksi: p.noProduksi,
          namaMesin: p.namaMesin,
        })),
      };
    }
    if (mode === "HOTSTAMP") {
      const res = await fetchStampingList(token, { page: 1, pageSize: 100, tanggal });
      return {
        ok: true,
        options: res.items.map((p: StampingProduction) => ({
          noProduksi: p.noProduksi,
          namaMesin: p.namaMesin,
        })),
      };
    }
    if (mode === "KEYFITTING") {
      const res = await fetchPasangKunciList(token, { page: 1, pageSize: 100, tanggal });
      return {
        ok: true,
        options: res.items.map((p: PasangKunciProduction) => ({
          noProduksi: p.noProduksi,
          namaMesin: p.namaMesin,
        })),
      };
    }
    if (mode === "SPANNER") {
      const res = await fetchSpannerList(token, { page: 1, pageSize: 100, tanggal });
      return {
        ok: true,
        options: res.items.map((p: SpannerProduction) => ({
          noProduksi: p.noProduksi,
          namaMesin: p.namaMesin,
        })),
      };
    }
    const res = await fetchReturList(token, {
      page: 1,
      pageSize: 100,
      dateFrom: tanggal,
      dateTo: tanggal,
    });
    return {
      ok: true,
      options: toProcessOptions(
        res.items.map((p: ReturHeader) => ({
          noRetur: p.noRetur,
          namaPembeli: p.namaPembeli,
        })),
      ),
    };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLfwOutputsAction(
  mode: LfwSourceMode,
  noProduksi: string,
): Promise<
  { ok: true; outputs: LfwOutputItem[] } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const outputs = await getLfwOutputs(token, mode, noProduksi);
    return { ok: true, outputs };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLfwInjectCandidatesAction(
  noProduksi: string,
): Promise<
  | { ok: true; candidates: LfwInjectCandidate[]; beratTimbang: number | null }
  | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const { candidates, beratTimbang } = await getLfwInjectCandidates(token, noProduksi);
    return { ok: true, candidates, beratTimbang };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLfwPartialInfoAction(
  noFurnitureWip: string,
): Promise<
  { ok: true; info: LfwPartialInfo } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const info = await getLfwPartialInfo(token, noFurnitureWip);
    return { ok: true, info };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

function buildOutputCode(mode: LfwSourceMode, noProduksi: string): string {
  const prefixByMode: Record<LfwSourceMode, string> = {
    INJECT: "S.",
    HOTSTAMP: "BH.",
    KEYFITTING: "BI.",
    SPANNER: "BJ.",
    RETUR: "L.",
  };
  const no = noProduksi.trim();
  const prefix = prefixByMode[mode];
  if (no.startsWith(prefix)) return no;
  return prefix + no.replace(/^[A-Z]{1,2}\./, "");
}

export async function createLfwAction(args: {
  mode: LfwSourceMode;
  noProduksi: string;
  dateCreate: string;
  pcs: number;
  berat: number | null;
  idJenisList: number[];
  printMode: "single" | "multiple" | "quick";
  quickCount: number;
}): Promise<{ ok: true; nos: string[] } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    const outputCode = buildOutputCode(args.mode, args.noProduksi);
    const rounds = args.printMode === "quick" ? Math.max(1, args.quickCount) : 1;
    const allNos: string[] = [];

    for (let r = 0; r < rounds; r++) {
      for (const idJenis of args.idJenisList) {
        const nos = await createLfw(token, {
          header: {
            IdFurnitureWIP: idJenis,
            Pcs: args.pcs,
            Berat: args.berat,
            DateCreate: args.dateCreate,
            IsPartial: 0,
          },
          outputCode,
        });
        allNos.push(...nos);
      }
    }

    return { ok: true, nos: allNos };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function updateLfwAction(args: {
  noFurnitureWip: string;
  dateCreate: string;
  idJenis: number;
  pcs: number;
  berat: number | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    await updateLfw(token, args.noFurnitureWip, {
      header: {
        DateCreate: args.dateCreate,
        IdFurnitureWIP: args.idJenis,
        Pcs: args.pcs,
        Berat: args.berat,
      },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function deleteLfwAction(
  noFurnitureWip: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    await deleteLfw(token, noFurnitureWip);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLfwPrintLocksAction(): Promise<
  { ok: true; locks: LbPrintLock[] } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const locks = await getLbPrintLocks(token);
    return { ok: true, locks };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function printLfwLabelAction(
  noFurnitureWip: string,
): Promise<
  { ok: true; pdfBase64: string; warning?: string } | { ok: false; error: string }
> {
  const token = await getToken();
  if (!token) return { ok: false, error: "Sesi login berakhir, silakan login ulang" };

  try {
    await acquireLbPrintLock(token, noFurnitureWip);
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }

  try {
    const pdfBase64 = await fetchLfwLabelPdfBase64(token, noFurnitureWip);
    let warning: string | undefined;
    try {
      await markLfwPrinted(token, noFurnitureWip);
    } catch (e) {
      warning = `PDF siap dicetak, tetapi hitungan cetak gagal diperbarui: ${errMsg(e)}`;
    }
    return { ok: true, pdfBase64, warning };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  } finally {
    await releaseLbPrintLock(token, noFurnitureWip);
  }
}
