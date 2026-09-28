"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { ApiRequestError } from "@/services/api";
import {
  createPacking,
  deletePacking,
  updatePacking,
  completePacking,
  uncompletePacking,
  submitPackingInputs,
  deletePackingInputs,
  createBjOutput,
  fetchPackingMesin,
  fetchPackingList,
  fetchPackingOne,
  fetchPackingInputs,
  fetchPackingOutputs,
  fetchPackingTypes,
  fetchCabinetMaterials,
  fetchPackingStok,
  fetchPackingStokLabels,
  lookupFwipLabel,
  splitPackingTime,
  markLabelPrinted,
  deleteOutputLabel,
  acquireLabelPrintLock,
  releaseLabelPrintLock,
  fetchOutputLabelPdfBase64,
  type CreatePackingPayload,
  type UpdatePackingPayload,
  type SubmitInputsPayload,
  type FetchPackingListParams,
} from "@/services/packing-service";
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

export async function getPackingMesinAction() {
  try {
    const token = await getToken();
    return { ok: true as const, ...(await fetchPackingMesin(token)) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── Jenis output / reject / material ─────────────────────────────────────────

export async function getPackingTypesAction() {
  try {
    const token = await getToken();
    const types = await fetchPackingTypes(token);
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

const PACKING_ID_BAGIAN = 6;

export async function getReguListAction(idBagian: number = PACKING_ID_BAGIAN) {
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

export async function getPackingListAction(
  params: FetchPackingListParams = {},
) {
  try {
    const token = await getToken();
    return { ok: true as const, ...(await fetchPackingList(token, params)) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getPackingOneAction(noProduksi: string) {
  try {
    const token = await getToken();
    const item = await fetchPackingOne(token, noProduksi);
    return { ok: true as const, item };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export type PackingFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  noProduksi?: string;
};

export async function createPackingAction(
  _prev: PackingFormState,
  formData: FormData,
): Promise<PackingFormState> {
  try {
    const token = await getToken();
    const operatorsRaw = String(formData.get("idOperators") ?? "");
    const idOperators = operatorsRaw
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n) && n !== 0);

    const payload: CreatePackingPayload = {
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

    const created = await createPacking(token, payload);
    revalidatePath("/production/packing");
    return {
      status: "success",
      message: `No. Produksi ${created.noProduksi} berhasil dibuat.`,
      noProduksi: created.noProduksi,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function updatePackingAction(
  noProduksi: string,
  payload: UpdatePackingPayload,
): Promise<PackingFormState> {
  try {
    const token = await getToken();
    const updated = await updatePacking(token, noProduksi, payload);
    revalidatePath("/production/packing");
    revalidatePath(`/production/packing/${noProduksi}`);
    return {
      status: "success",
      message: `No. Produksi ${updated.noProduksi} berhasil diperbarui.`,
      noProduksi: updated.noProduksi,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function deletePackingAction(
  noProduksi: string,
): Promise<PackingFormState> {
  try {
    const token = await getToken();
    await deletePacking(token, noProduksi);
    revalidatePath("/production/packing");
    return {
      status: "success",
      message: `No. Produksi ${noProduksi} berhasil dihapus.`,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function completePackingAction(
  noProduksi: string,
): Promise<PackingFormState> {
  try {
    const token = await getToken();
    await completePacking(token, noProduksi);
    revalidatePath(`/production/packing/${noProduksi}`);
    return { status: "success", message: "Produksi berhasil diselesaikan." };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function uncompletePackingAction(
  noProduksi: string,
): Promise<PackingFormState> {
  try {
    const token = await getToken();
    await uncompletePacking(token, noProduksi);
    revalidatePath(`/production/packing/${noProduksi}`);
    return { status: "success", message: "Kunci produksi berhasil dibuka." };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function splitPackingTimeAction(params: {
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
    const result = await splitPackingTime(token, params.idMesin, params.tanggal, {
      hourStart: params.hourStart,
      outputJenisId: params.outputJenisId,
    });
    revalidatePath("/production/packing");
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

export async function getPackingInputsAction(noProduksi: string) {
  try {
    const token = await getToken();
    const inputs = await fetchPackingInputs(token, noProduksi);
    return { ok: true as const, inputs };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getPackingOutputsAction(noProduksi: string) {
  try {
    const token = await getToken();
    const outputs = await fetchPackingOutputs(token, noProduksi);
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

export async function submitPackingInputsAction(
  noProduksi: string,
  payload: SubmitInputsPayload,
): Promise<PackingFormState> {
  try {
    const token = await getToken();
    await submitPackingInputs(token, noProduksi, payload);
    revalidatePath(`/production/packing/${noProduksi}`);
    return { status: "success", message: "Data berhasil disimpan." };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function deletePackingInputsAction(
  noProduksi: string,
  payload: SubmitInputsPayload,
): Promise<PackingFormState> {
  try {
    const token = await getToken();
    await deletePackingInputs(token, noProduksi, payload);
    revalidatePath(`/production/packing/${noProduksi}`);
    return { status: "success", message: "Data berhasil dihapus." };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

// ── Output create ────────────────────────────────────────────────────────────

export async function createPackingBjOutputAction(
  noProduksi: string,
  idBj: number,
  tanggal: string,
  pcs: number,
): Promise<PackingFormState & { noLabel?: string }> {
  try {
    const token = await getToken();
    const noLabel = await createBjOutput(token, noProduksi, idBj, tanggal, pcs);
    revalidatePath(`/production/packing/${noProduksi}`);
    return {
      status: "success",
      message: noLabel
        ? `Label ${noLabel} berhasil dibuat.`
        : "Label Barang Jadi berhasil dibuat.",
      noProduksi: noLabel,
      noLabel,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

// ── Stok sidebar (Barang Jadi) ─────────────────────────────────────────────

export async function getPackingStokAction() {
  try {
    const token = await getToken();
    return { ok: true as const, items: await fetchPackingStok(token) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getPackingStokLabelsAction(idBj: number) {
  try {
    const token = await getToken();
    return {
      ok: true as const,
      items: await fetchPackingStokLabels(token, idBj),
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── Output label: print / delete ─────────────────────────────────────────────

export async function printPackingLabelAction(noLabel: string) {
  let locked = false;
  try {
    const token = await getToken();
    await acquireLabelPrintLock(token, noLabel);
    locked = true;
    const pdfBase64 = await fetchOutputLabelPdfBase64(token, noLabel);
    const hasBeenPrinted = await markLabelPrinted(token, noLabel);
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

export async function deletePackingLabelAction(noLabel: string) {
  try {
    const token = await getToken();
    await deleteOutputLabel(token, noLabel);
    return {
      ok: true as const,
      message: `Label ${noLabel} berhasil dihapus.`,
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}
