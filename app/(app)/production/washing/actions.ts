"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { ApiRequestError } from "@/services/api";
import {
  createWashing,
  deleteWashing,
  updateWashing,
  completeWashing,
  uncompleteWashing,
  submitWashingInputs,
  deleteWashingInputs,
  createWashingOutput,
  fetchWashingMesin,
  fetchWashingList,
  fetchWashingOne,
  fetchWashingInputs,
  fetchWashingOutputs,
  fetchWashingFormula,
  fetchWashingTypes,
  lookupWashingLabel,
  splitWashingTime,
  fetchMaxSak,
  markWashingLabelPrinted,
  deleteWashingLabel,
  acquireLabelPrintLock,
  releaseLabelPrintLock,
  fetchWashingLabelPdfBase64,
  type CreateWashingPayload,
  type UpdateWashingPayload,
  type SubmitInputsPayload,
  type FetchWashingListParams,
} from "@/services/washing-service";
import {
  fetchStokBahanBakuProses,
  fetchStokBahanBakuProsesLabel,
} from "@/services/stok-service";
import {
  fetchReguList,
  fetchOperatorsByRegu,
  fetchAllOperators,
  fetchShiftHour,
  checkWashingOverlap,
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

export async function getWashingMesinAction() {
  try {
    const token = await getToken();
    return { ok: true as const, ...(await fetchWashingMesin(token)) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── Jenis Washing (MstWashing) ───────────────────────────────────────────────

export async function getWashingTypesAction() {
  try {
    const token = await getToken();
    const types = await fetchWashingTypes(token);
    return { ok: true as const, types };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── Regu / Operator / Shift / Overlap (form create) ──────────────────────────

const WASHING_ID_BAGIAN = 7;

export async function getReguListAction(idBagian: number = WASHING_ID_BAGIAN) {
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

export async function checkWashingOverlapAction(params: {
  date: string;
  idMesin: number;
  start: string;
  end: string;
  exclude?: string;
}) {
  try {
    const token = await getToken();
    const result = await checkWashingOverlap(token, params);
    return { ok: true as const, ...result };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── List ─────────────────────────────────────────────────────────────────────

export async function getWashingListAction(params: FetchWashingListParams = {}) {
  try {
    const token = await getToken();
    return { ok: true as const, ...(await fetchWashingList(token, params)) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getWashingOneAction(noProduksi: string) {
  try {
    const token = await getToken();
    const item = await fetchWashingOne(token, noProduksi);
    return { ok: true as const, item };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export type WashingFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  noProduksi?: string;
};

export async function createWashingAction(
  _prev: WashingFormState,
  formData: FormData,
): Promise<WashingFormState> {
  try {
    const token = await getToken();
    const operatorsRaw = String(formData.get("idOperators") ?? "");
    const idOperators = operatorsRaw
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n) && n !== 0);

    const payload: CreateWashingPayload = {
      tglProduksi: String(formData.get("tglProduksi") ?? ""),
      idMesin: parseInt(String(formData.get("idMesin") ?? "0"), 10),
      idOperators,
      jamKerja: String(formData.get("jamKerja") ?? "0"),
      shift: parseInt(String(formData.get("shift") ?? "1"), 10),
      isBlower: formData.get("isBlower") === "1",
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

    if (!payload.tglProduksi || !payload.idMesin) {
      return { status: "error", message: "Tanggal dan mesin harus diisi" };
    }
    if (payload.idOperators.length === 0) {
      return { status: "error", message: "Operator harus dipilih" };
    }

    const created = await createWashing(token, payload);
    revalidatePath("/production/washing");
    return {
      status: "success",
      message: `No. Produksi ${created.noProduksi} berhasil dibuat.`,
      noProduksi: created.noProduksi,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function updateWashingAction(
  noProduksi: string,
  payload: UpdateWashingPayload,
): Promise<WashingFormState> {
  try {
    const token = await getToken();
    const updated = await updateWashing(token, noProduksi, payload);
    revalidatePath("/production/washing");
    revalidatePath(`/production/washing/${noProduksi}`);
    return {
      status: "success",
      message: `No. Produksi ${updated.noProduksi} berhasil diperbarui.`,
      noProduksi: updated.noProduksi,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function deleteWashingAction(
  noProduksi: string,
): Promise<WashingFormState> {
  try {
    const token = await getToken();
    await deleteWashing(token, noProduksi);
    revalidatePath("/production/washing");
    return {
      status: "success",
      message: `No. Produksi ${noProduksi} berhasil dihapus.`,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function completeWashingAction(noProduksi: string): Promise<WashingFormState> {
  try {
    const token = await getToken();
    await completeWashing(token, noProduksi);
    revalidatePath(`/production/washing/${noProduksi}`);
    return { status: "success", message: "Produksi berhasil diselesaikan." };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function uncompleteWashingAction(noProduksi: string): Promise<WashingFormState> {
  try {
    const token = await getToken();
    await uncompleteWashing(token, noProduksi);
    revalidatePath(`/production/washing/${noProduksi}`);
    return { status: "success", message: "Kunci produksi berhasil dibuka." };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function splitWashingTimeAction(params: {
  idMesin: number;
  tanggal: string;
  hourStart: string;
  outputJenisId: number;
}): Promise<{ status: "success" | "error"; message?: string; noProduksi?: string }> {
  try {
    const token = await getToken();
    const result = await splitWashingTime(token, params.idMesin, params.tanggal, {
      hourStart: params.hourStart,
      outputJenisId: params.outputJenisId,
    });
    revalidatePath("/production/washing");
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

export async function getWashingInputsAction(noProduksi: string) {
  try {
    const token = await getToken();
    const inputs = await fetchWashingInputs(token, noProduksi);
    return { ok: true as const, inputs };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getWashingOutputsAction(noProduksi: string) {
  try {
    const token = await getToken();
    const outputs = await fetchWashingOutputs(token, noProduksi);
    return { ok: true as const, outputs };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getWashingFormulaAction(noProduksi: string) {
  try {
    const token = await getToken();
    const formula = await fetchWashingFormula(token, noProduksi);
    return {
      ok: true as const,
      kodes: Array.from(formula.kodes),
      outputs: formula.outputs,
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function lookupWashingLabelAction(labelCode: string) {
  try {
    const token = await getToken();
    return { ok: true as const, ...(await lookupWashingLabel(token, labelCode)) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── Inputs submit / delete ───────────────────────────────────────────────────

export async function submitWashingInputsAction(
  noProduksi: string,
  payload: SubmitInputsPayload,
): Promise<WashingFormState> {
  try {
    const token = await getToken();
    await submitWashingInputs(token, noProduksi, payload);
    revalidatePath(`/production/washing/${noProduksi}`);
    return { status: "success", message: "Data berhasil disimpan." };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function deleteWashingInputsAction(
  noProduksi: string,
  payload: SubmitInputsPayload,
): Promise<WashingFormState> {
  try {
    const token = await getToken();
    await deleteWashingInputs(token, noProduksi, payload);
    revalidatePath(`/production/washing/${noProduksi}`);
    return { status: "success", message: "Data berhasil dihapus." };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

// ── Output create ────────────────────────────────────────────────────────────

export async function createWashingOutputAction(
  noProduksi: string,
  idJenis: number,
  tglProduksi: string,
  details: { NoSak: number; Berat: number }[],
): Promise<WashingFormState & { noWashing?: string }> {
  try {
    const token = await getToken();
    const noWashing = await createWashingOutput(token, noProduksi, idJenis, tglProduksi, details);
    revalidatePath(`/production/washing/${noProduksi}`);
    return {
      status: "success",
      message: noWashing
        ? `Label ${noWashing} berhasil dibuat.`
        : "Label washing berhasil dibuat.",
      noWashing,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function getMaxSakAction(idBagian = 3) {
  try {
    const token = await getToken();
    return { ok: true as const, ...(await fetchMaxSak(token, idBagian)) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── Stok Item (sidebar drawer) ───────────────────────────────────────────────

export async function getStokBahanBakuProsesAction() {
  try {
    const token = await getToken();
    return { ok: true as const, items: await fetchStokBahanBakuProses(token) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getStokBahanBakuProsesLabelsAction(idBB: number) {
  try {
    const token = await getToken();
    return {
      ok: true as const,
      items: await fetchStokBahanBakuProsesLabel(token, idBB),
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── Output label: print / delete ─────────────────────────────────────────────

export async function printWashingLabelAction(noWashing: string) {
  let locked = false;
  try {
    const token = await getToken();
    await acquireLabelPrintLock(token, noWashing);
    locked = true;
    const pdfBase64 = await fetchWashingLabelPdfBase64(token, noWashing);
    const hasBeenPrinted = await markWashingLabelPrinted(token, noWashing);
    await releaseLabelPrintLock(token, noWashing);
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
        await releaseLabelPrintLock(token, noWashing);
      } catch {
        /* best-effort */
      }
    }
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function deleteWashingLabelAction(noWashing: string) {
  try {
    const token = await getToken();
    await deleteWashingLabel(token, noWashing);
    return { ok: true as const, message: `Label ${noWashing} berhasil dihapus.` };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}
