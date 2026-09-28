"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { ApiRequestError } from "@/services/api";
import {
  createCrusher,
  deleteCrusher,
  updateCrusher,
  completeCrusher,
  uncompleteCrusher,
  submitCrusherInputs,
  deleteCrusherInputs,
  createCrusherOutput,
  fetchCrusherMesin,
  fetchCrusherList,
  fetchCrusherOne,
  fetchCrusherInputs,
  fetchCrusherOutputs,
  fetchCrusherFormula,
  fetchCrusherTypes,
  lookupCrusherLabel,
  splitCrusherTime,
  markCrusherLabelPrinted,
  deleteCrusherLabel,
  acquireLabelPrintLock,
  releaseLabelPrintLock,
  fetchCrusherLabelPdfBase64,
  type CreateCrusherPayload,
  type UpdateCrusherPayload,
  type SubmitInputsPayload,
  type FetchCrusherListParams,
} from "@/services/crusher-service";
import {
  fetchStokBonggolan,
  fetchStokBonggolanLabel,
} from "@/services/stok-service";
import {
  fetchReguList,
  fetchOperatorsByRegu,
  fetchAllOperators,
  fetchShiftHour,
  checkCrusherOverlap,
} from "@/services/production-form-service";

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError) return e.message;
  if (e instanceof Error) return e.message.replace(/^Exception:\s*/, "");
  return "Terjadi kesalahan tak terduga";
}

// ── Mesin ────────────────────────────────────────────────────────────────────

export async function getCrusherMesinAction() {
  try {
    const token = await getToken();
    return { ok: true as const, ...(await fetchCrusherMesin(token)) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── Jenis Crusher ────────────────────────────────────────────────────────────

export async function getCrusherTypesAction() {
  try {
    const token = await getToken();
    const types = await fetchCrusherTypes(token);
    return { ok: true as const, types };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── Regu / Operator / Shift / Overlap (form create) ──────────────────────────

const CRUSHER_ID_BAGIAN = 7;

export async function getReguListAction(idBagian: number = CRUSHER_ID_BAGIAN) {
  try {
    const token = await getToken();
    const items = await fetchReguList(token, idBagian);
    return { ok: true as const, items };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getOperatorsByReguAction(idRegu: number) {
  try {
    const token = await getToken();
    const items = await fetchOperatorsByRegu(token, idRegu);
    return { ok: true as const, items };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getAllOperatorsAction() {
  try {
    const token = await getToken();
    const items = await fetchAllOperators(token);
    return { ok: true as const, items };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getShiftHourAction(tanggal: string, shift: number) {
  try {
    const token = await getToken();
    const hour = await fetchShiftHour(token, tanggal, shift);
    return { ok: true as const, hour };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function checkCrusherOverlapAction(params: {
  date: string;
  idMesin: number;
  start: string;
  end: string;
  exclude?: string;
}) {
  try {
    const token = await getToken();
    const result = await checkCrusherOverlap(token, params);
    return { ok: true as const, ...result };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── List ─────────────────────────────────────────────────────────────────────

export async function getCrusherListAction(params: FetchCrusherListParams = {}) {
  try {
    const token = await getToken();
    return { ok: true as const, ...(await fetchCrusherList(token, params)) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getCrusherOneAction(noProduksi: string) {
  try {
    const token = await getToken();
    const item = await fetchCrusherOne(token, noProduksi);
    return { ok: true as const, item };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export type CrusherFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  noProduksi?: string;
};

export async function createCrusherAction(
  _prev: CrusherFormState,
  formData: FormData,
): Promise<CrusherFormState> {
  try {
    const token = await getToken();
    const operatorsRaw = String(formData.get("idOperators") ?? "");
    const idOperators = operatorsRaw
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n) && n !== 0);

    const payload: CreateCrusherPayload = {
      tanggal: String(formData.get("tglProduksi") ?? formData.get("tanggal") ?? ""),
      idMesin: parseInt(String(formData.get("idMesin") ?? "0"), 10),
      idOperators,
      jamKerja: String(formData.get("jamKerja") ?? "0"),
      shift: parseInt(String(formData.get("shift") ?? "1"), 10),
      hourStart: String(formData.get("hourStart") ?? "") || undefined,
      hourEnd: String(formData.get("hourEnd") ?? "") || undefined,
      hadir: formData.get("hadir") ? parseInt(String(formData.get("hadir")), 10) : undefined,
      jmlhAnggota: formData.get("jmlhAnggota")
        ? parseInt(String(formData.get("jmlhAnggota")), 10)
        : undefined,
      outputJenisId: formData.get("outputJenisId")
        ? parseInt(String(formData.get("outputJenisId")), 10)
        : undefined,
      idRegu: formData.get("idRegu")
        ? parseInt(String(formData.get("idRegu")), 10)
        : undefined,
      hourMeter: formData.get("hourMeter")
        ? parseInt(String(formData.get("hourMeter")), 10)
        : undefined,
    };

    if (!payload.tanggal || !payload.idMesin) {
      return { status: "error", message: "Tanggal dan mesin harus diisi" };
    }
    if (payload.idOperators.length === 0) {
      return { status: "error", message: "Operator harus dipilih" };
    }

    const created = await createCrusher(token, payload);
    revalidatePath("/production/crusher");
    return {
      status: "success",
      message: `No. Produksi ${created.noProduksi} berhasil dibuat.`,
      noProduksi: created.noProduksi,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function updateCrusherAction(
  noProduksi: string,
  payload: UpdateCrusherPayload,
): Promise<CrusherFormState> {
  try {
    const token = await getToken();
    const updated = await updateCrusher(token, noProduksi, payload);
    revalidatePath("/production/crusher");
    revalidatePath(`/production/crusher/${noProduksi}`);
    return {
      status: "success",
      message: `No. Produksi ${updated.noProduksi} berhasil diperbarui.`,
      noProduksi: updated.noProduksi,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function deleteCrusherAction(
  noProduksi: string,
): Promise<CrusherFormState> {
  try {
    const token = await getToken();
    await deleteCrusher(token, noProduksi);
    revalidatePath("/production/crusher");
    return {
      status: "success",
      message: `No. Produksi ${noProduksi} berhasil dihapus.`,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function completeCrusherAction(noProduksi: string): Promise<CrusherFormState> {
  try {
    const token = await getToken();
    await completeCrusher(token, noProduksi);
    revalidatePath(`/production/crusher/${noProduksi}`);
    return { status: "success", message: "Produksi berhasil diselesaikan." };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function uncompleteCrusherAction(noProduksi: string): Promise<CrusherFormState> {
  try {
    const token = await getToken();
    await uncompleteCrusher(token, noProduksi);
    revalidatePath(`/production/crusher/${noProduksi}`);
    return { status: "success", message: "Kunci produksi berhasil dibuka." };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function splitCrusherTimeAction(params: {
  idMesin: number;
  tanggal: string;
  hourStart: string;
  outputJenisId: number;
}): Promise<{ status: "success" | "error"; message?: string; noProduksi?: string }> {
  try {
    const token = await getToken();
    const result = await splitCrusherTime(token, params.idMesin, params.tanggal, {
      hourStart: params.hourStart,
      outputJenisId: params.outputJenisId,
    });
    revalidatePath("/production/crusher");
    return {
      status: "success",
      message: "Ganti produksi berhasil.",
      noProduksi: result.noProduksi,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

// ── Detail data ──────────────────────────────────────────────────────────────

export async function getCrusherInputsAction(noProduksi: string) {
  try {
    const token = await getToken();
    const inputs = await fetchCrusherInputs(token, noProduksi);
    return { ok: true as const, inputs };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getCrusherOutputsAction(noProduksi: string) {
  try {
    const token = await getToken();
    const outputs = await fetchCrusherOutputs(token, noProduksi);
    return { ok: true as const, outputs };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getCrusherFormulaAction(noProduksi: string) {
  try {
    const token = await getToken();
    const formula = await fetchCrusherFormula(token, noProduksi);
    return {
      ok: true as const,
      kodes: Array.from(formula.kodes),
      outputs: formula.outputs,
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function lookupCrusherLabelAction(labelCode: string) {
  try {
    const token = await getToken();
    return { ok: true as const, ...(await lookupCrusherLabel(token, labelCode)) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── Inputs submit / delete ───────────────────────────────────────────────────

export async function submitCrusherInputsAction(
  noProduksi: string,
  payload: SubmitInputsPayload,
): Promise<CrusherFormState> {
  try {
    const token = await getToken();
    await submitCrusherInputs(token, noProduksi, payload);
    revalidatePath(`/production/crusher/${noProduksi}`);
    return { status: "success", message: "Data berhasil disimpan." };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function deleteCrusherInputsAction(
  noProduksi: string,
  payload: SubmitInputsPayload,
): Promise<CrusherFormState> {
  try {
    const token = await getToken();
    await deleteCrusherInputs(token, noProduksi, payload);
    revalidatePath(`/production/crusher/${noProduksi}`);
    return { status: "success", message: "Data berhasil dihapus." };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

// ── Output create ────────────────────────────────────────────────────────────

export async function createCrusherOutputAction(
  noProduksi: string,
  idJenis: number,
  tanggal: string,
  berat: number,
): Promise<CrusherFormState & { noCrusher?: string }> {
  try {
    const token = await getToken();
    const noCrusher = await createCrusherOutput(token, noProduksi, idJenis, tanggal, berat);
    revalidatePath(`/production/crusher/${noProduksi}`);
    return {
      status: "success",
      message: noCrusher
        ? `Label ${noCrusher} berhasil dibuat.`
        : "Label crusher berhasil dibuat.",
      noProduksi: noCrusher,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

// ── Stok Item (sidebar drawer) ───────────────────────────────────────────────

export async function getStokBonggolanAction() {
  try {
    const token = await getToken();
    return { ok: true as const, items: await fetchStokBonggolan(token) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getStokBonggolanLabelsAction(idBonggolan: number) {
  try {
    const token = await getToken();
    return {
      ok: true as const,
      items: await fetchStokBonggolanLabel(token, idBonggolan),
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── Output label: print / delete ─────────────────────────────────────────────

export async function printCrusherLabelAction(noCrusher: string) {
  let locked = false;
  try {
    const token = await getToken();
    await acquireLabelPrintLock(token, noCrusher);
    locked = true;
    const pdfBase64 = await fetchCrusherLabelPdfBase64(token, noCrusher);
    const hasBeenPrinted = await markCrusherLabelPrinted(token, noCrusher);
    await releaseLabelPrintLock(token, noCrusher);
    locked = false;
    return {
      ok: true as const,
      pdfBase64,
      hasBeenPrinted,
    };
  } catch (e) {
    if (locked) {
      try {
        const token = await getToken();
        await releaseLabelPrintLock(token, noCrusher);
      } catch {
        /* best-effort */
      }
    }
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function deleteCrusherLabelAction(noCrusher: string) {
  try {
    const token = await getToken();
    await deleteCrusherLabel(token, noCrusher);
    return { ok: true as const, message: `Label ${noCrusher} berhasil dihapus.` };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}
