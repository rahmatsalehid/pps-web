"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { ApiRequestError } from "@/services/api";
import {
  createSpanner,
  deleteSpanner,
  updateSpanner,
  completeSpanner,
  uncompleteSpanner,
  submitSpannerInputs,
  deleteSpannerInputs,
  createFwipOutput,
  createRejectOutput,
  fetchSpannerMesin,
  fetchSpannerList,
  fetchSpannerOne,
  fetchSpannerInputs,
  fetchSpannerOutputs,
  fetchSpannerTypes,
  fetchRejectTypes,
  fetchCabinetMaterials,
  fetchSpannerStok,
  fetchSpannerStokLabels,
  lookupFwipLabel,
  splitSpannerTime,
  markLabelPrinted,
  deleteOutputLabel,
  acquireLabelPrintLock,
  releaseLabelPrintLock,
  fetchOutputLabelPdfBase64,
  type CreateSpannerPayload,
  type UpdateSpannerPayload,
  type SubmitInputsPayload,
  type FetchSpannerListParams,
  type SpannerOutputCategory,
} from "@/services/spanner-service";
import {
  fetchReguList,
  fetchOperatorsByRegu,
  fetchAllOperators,
  fetchShiftHour,
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

export async function getSpannerMesinAction() {
  try {
    const token = await getToken();
    return { ok: true as const, ...(await fetchSpannerMesin(token)) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── Jenis output / reject / material ─────────────────────────────────────────

export async function getSpannerTypesAction() {
  try {
    const token = await getToken();
    const types = await fetchSpannerTypes(token);
    return { ok: true as const, types };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getRejectTypesAction() {
  try {
    const token = await getToken();
    const types = await fetchRejectTypes(token);
    return { ok: true as const, types };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getCabinetMaterialsAction(idWarehouse = 5) {
  try {
    const token = await getToken();
    const items = await fetchCabinetMaterials(token, idWarehouse);
    return { ok: true as const, items };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── Regu / Operator / Shift (form create) ────────────────────────────────────

const SPANNER_ID_BAGIAN = 9;

export async function getReguListAction(idBagian: number = SPANNER_ID_BAGIAN) {
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

// ── List ─────────────────────────────────────────────────────────────────────

export async function getSpannerListAction(
  params: FetchSpannerListParams = {},
) {
  try {
    const token = await getToken();
    return { ok: true as const, ...(await fetchSpannerList(token, params)) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getSpannerOneAction(noProduksi: string) {
  try {
    const token = await getToken();
    const item = await fetchSpannerOne(token, noProduksi);
    return { ok: true as const, item };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export type SpannerFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  noProduksi?: string;
};

export async function createSpannerAction(
  _prev: SpannerFormState,
  formData: FormData,
): Promise<SpannerFormState> {
  try {
    const token = await getToken();
    const operatorsRaw = String(formData.get("idOperators") ?? "");
    const idOperators = operatorsRaw
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n) && n !== 0);

    const payload: CreateSpannerPayload = {
      tglProduksi: String(
        formData.get("tglProduksi") ?? formData.get("tanggal") ?? "",
      ),
      idMesin: parseInt(String(formData.get("idMesin") ?? "0"), 10),
      idOperators,
      jamKerja: String(formData.get("jamKerja") ?? "0"),
      shift: parseInt(String(formData.get("shift") ?? "1"), 10),
      hourStart: String(formData.get("hourStart") ?? "") || undefined,
      hourEnd: String(formData.get("hourEnd") ?? "") || undefined,
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

    const created = await createSpanner(token, payload);
    revalidatePath("/production/spanner");
    return {
      status: "success",
      message: `No. Produksi ${created.noProduksi} berhasil dibuat.`,
      noProduksi: created.noProduksi,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function updateSpannerAction(
  noProduksi: string,
  payload: UpdateSpannerPayload,
): Promise<SpannerFormState> {
  try {
    const token = await getToken();
    const updated = await updateSpanner(token, noProduksi, payload);
    revalidatePath("/production/spanner");
    revalidatePath(`/production/spanner/${noProduksi}`);
    return {
      status: "success",
      message: `No. Produksi ${updated.noProduksi} berhasil diperbarui.`,
      noProduksi: updated.noProduksi,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function deleteSpannerAction(
  noProduksi: string,
): Promise<SpannerFormState> {
  try {
    const token = await getToken();
    await deleteSpanner(token, noProduksi);
    revalidatePath("/production/spanner");
    return {
      status: "success",
      message: `No. Produksi ${noProduksi} berhasil dihapus.`,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function completeSpannerAction(
  noProduksi: string,
): Promise<SpannerFormState> {
  try {
    const token = await getToken();
    await completeSpanner(token, noProduksi);
    revalidatePath(`/production/spanner/${noProduksi}`);
    return { status: "success", message: "Produksi berhasil diselesaikan." };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function uncompleteSpannerAction(
  noProduksi: string,
): Promise<SpannerFormState> {
  try {
    const token = await getToken();
    await uncompleteSpanner(token, noProduksi);
    revalidatePath(`/production/spanner/${noProduksi}`);
    return { status: "success", message: "Kunci produksi berhasil dibuka." };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function splitSpannerTimeAction(params: {
  idMesin: number;
  tanggal: string;
  hourStart: string;
  outputJenisId: number;
}): Promise<{
  status: "success" | "error";
  message?: string;
  noProduksi?: string;
}> {
  try {
    const token = await getToken();
    const result = await splitSpannerTime(token, params.idMesin, params.tanggal, {
      hourStart: params.hourStart,
      outputJenisId: params.outputJenisId,
    });
    revalidatePath("/production/spanner");
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

export async function getSpannerInputsAction(noProduksi: string) {
  try {
    const token = await getToken();
    const inputs = await fetchSpannerInputs(token, noProduksi);
    return { ok: true as const, inputs };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getSpannerOutputsAction(noProduksi: string) {
  try {
    const token = await getToken();
    const outputs = await fetchSpannerOutputs(token, noProduksi);
    return { ok: true as const, outputs };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function lookupFwipLabelAction(labelCode: string) {
  try {
    const token = await getToken();
    return {
      ok: true as const,
      ...(await lookupFwipLabel(token, labelCode)),
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── Inputs submit / delete ───────────────────────────────────────────────────

export async function submitSpannerInputsAction(
  noProduksi: string,
  payload: SubmitInputsPayload,
): Promise<SpannerFormState> {
  try {
    const token = await getToken();
    await submitSpannerInputs(token, noProduksi, payload);
    revalidatePath(`/production/spanner/${noProduksi}`);
    return { status: "success", message: "Data berhasil disimpan." };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function deleteSpannerInputsAction(
  noProduksi: string,
  payload: SubmitInputsPayload,
): Promise<SpannerFormState> {
  try {
    const token = await getToken();
    await deleteSpannerInputs(token, noProduksi, payload);
    revalidatePath(`/production/spanner/${noProduksi}`);
    return { status: "success", message: "Data berhasil dihapus." };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

// ── Output create ────────────────────────────────────────────────────────────

export async function createSpannerFwipOutputAction(
  noProduksi: string,
  idJenis: number,
  tanggal: string,
  pcs: number,
): Promise<SpannerFormState & { noLabel?: string }> {
  try {
    const token = await getToken();
    const noLabel = await createFwipOutput(token, noProduksi, idJenis, tanggal, pcs);
    revalidatePath(`/production/spanner/${noProduksi}`);
    return {
      status: "success",
      message: noLabel
        ? `Label ${noLabel} berhasil dibuat.`
        : "Label Furniture WIP berhasil dibuat.",
      noProduksi: noLabel,
      noLabel,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function createSpannerRejectOutputAction(
  noProduksi: string,
  idReject: number,
  tanggal: string,
  berat: number,
  jam: string,
): Promise<SpannerFormState & { noLabel?: string }> {
  try {
    const token = await getToken();
    const noLabel = await createRejectOutput(
      token,
      noProduksi,
      idReject,
      tanggal,
      berat,
      jam,
    );
    revalidatePath(`/production/spanner/${noProduksi}`);
    return {
      status: "success",
      message: noLabel
        ? `Label ${noLabel} berhasil dibuat.`
        : "Label Reject berhasil dibuat.",
      noProduksi: noLabel,
      noLabel,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

// ── Stok sidebar (Furniture WIP) ─────────────────────────────────────────────

export async function getSpannerStokAction() {
  try {
    const token = await getToken();
    return { ok: true as const, items: await fetchSpannerStok(token) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getSpannerStokLabelsAction(idCabinetWip: number) {
  try {
    const token = await getToken();
    return {
      ok: true as const,
      items: await fetchSpannerStokLabels(token, idCabinetWip),
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── Output label: print / delete ─────────────────────────────────────────────

export async function printSpannerLabelAction(
  category: SpannerOutputCategory,
  noLabel: string,
) {
  let locked = false;
  try {
    const token = await getToken();
    await acquireLabelPrintLock(token, noLabel);
    locked = true;
    const pdfBase64 = await fetchOutputLabelPdfBase64(token, category, noLabel);
    const hasBeenPrinted = await markLabelPrinted(token, category, noLabel);
    await releaseLabelPrintLock(token, noLabel);
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
        await releaseLabelPrintLock(token, noLabel);
      } catch {
        /* best-effort */
      }
    }
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function deleteSpannerLabelAction(
  category: SpannerOutputCategory,
  noLabel: string,
) {
  try {
    const token = await getToken();
    await deleteOutputLabel(token, category, noLabel);
    return {
      ok: true as const,
      message: `Label ${noLabel} berhasil dihapus.`,
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}
