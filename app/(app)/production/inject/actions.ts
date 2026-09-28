"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { ApiRequestError } from "@/services/api";
import {
  createInject,
  deleteInject,
  updateInject,
  completeInject,
  uncompleteInject,
  submitInjectInputs,
  deleteInjectInputs,
  createFwipOutput,
  createBjOutput,
  createBonggolanOutput,
  createRejectOutput,
  fetchInjectMesin,
  fetchInjectList,
  fetchInjectOne,
  fetchInjectInputs,
  fetchInjectOutputs,
  fetchInjectPcsPerLabel,
  fetchInjectBatch,
  submitInjectBatch,
  terminateInject,
  discardInjectPcsPerLabel,
  fetchInjectStokFwip,
  fetchInjectStokFwipLabels,
  fetchCetakanList,
  fetchWarnaByCetakan,
  fetchFurnitureMaterialByCetakanWarna,
  fetchOutputTypes,
  fetchRejectTypes,
  fetchCabinetMaterials,
  lookupFwipLabel,
  splitInjectTime,
  markLabelPrinted,
  deleteOutputLabel,
  acquireLabelPrintLock,
  releaseLabelPrintLock,
  fetchOutputLabelPdfBase64,
  type CreateInjectPayload,
  type UpdateInjectPayload,
  type SubmitInputsPayload,
  type FetchInjectListParams,
  type InjectBatchSubmitPayload,
  type InjectOutputCategory,
} from "@/services/inject-service";
import {
  fetchStokBonggolan,
  fetchStokMixer,
  fetchStokMixerLabel,
} from "@/services/stok-service";
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

export async function getInjectMesinAction() {
  try {
    const token = await getToken();
    return { ok: true as const, ...(await fetchInjectMesin(token)) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── Jenis output / reject / material ─────────────────────────────────────────

export async function getCetakanListAction() {
  try {
    const token = await getToken();
    return { ok: true as const, items: await fetchCetakanList(token) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getWarnaByCetakanAction(idCetakan: number) {
  try {
    const token = await getToken();
    return { ok: true as const, items: await fetchWarnaByCetakan(token, idCetakan) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getFurnitureMaterialAction(
  idCetakan: number,
  idWarna: number,
) {
  try {
    const token = await getToken();
    return {
      ok: true as const,
      items: await fetchFurnitureMaterialByCetakanWarna(token, idCetakan, idWarna),
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getOutputTypesAction(category: "fwip" | "bj") {
  try {
    const token = await getToken();
    return { ok: true as const, items: await fetchOutputTypes(token, category) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getBonggolanTypesAction() {
  try {
    const token = await getToken();
    const stok = await fetchStokBonggolan(token);
    const seen = new Set<number>();
    const items: { idBonggolan: number; nama: string }[] = [];
    for (const it of stok) {
      if (it.idBonggolan === 0 || seen.has(it.idBonggolan)) continue;
      seen.add(it.idBonggolan);
      items.push({ idBonggolan: it.idBonggolan, nama: it.nama });
    }
    return { ok: true as const, items };
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

const INJECT_ID_BAGIAN = 4;

export async function getReguListAction(idBagian: number = INJECT_ID_BAGIAN) {
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

export async function getInjectListAction(
  params: FetchInjectListParams = {},
) {
  try {
    const token = await getToken();
    return { ok: true as const, ...(await fetchInjectList(token, params)) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getInjectOneAction(noProduksi: string) {
  try {
    const token = await getToken();
    const item = await fetchInjectOne(token, noProduksi);
    return { ok: true as const, item };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export type InjectFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  noProduksi?: string;
};

export async function createInjectAction(
  _prev: InjectFormState,
  formData: FormData,
): Promise<InjectFormState> {
  try {
    const token = await getToken();
    const operatorsRaw = String(formData.get("idOperators") ?? "");
    const idOperators = operatorsRaw
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n) && n !== 0);

    const payload: CreateInjectPayload = {
      tglProduksi: String(
        formData.get("tglProduksi") ?? formData.get("tanggal") ?? "",
      ),
      idMesin: parseInt(String(formData.get("idMesin") ?? "0"), 10),
      idOperators,
      jamKerja: String(formData.get("jamKerja") ?? "0"),
      shift: parseInt(String(formData.get("shift") ?? "1"), 10),
      hourStart: String(formData.get("hourStart") ?? "") || undefined,
      hourEnd: String(formData.get("hourEnd") ?? "") || undefined,
      idCetakan: parseInt(String(formData.get("idCetakan") ?? "0"), 10),
      idWarna: parseInt(String(formData.get("idWarna") ?? "0"), 10),
      idFurnitureMaterial: formData.get("idFurnitureMaterial")
        ? parseInt(String(formData.get("idFurnitureMaterial")), 10) || undefined
        : undefined,
      idRegu: formData.get("idRegu")
        ? parseInt(String(formData.get("idRegu")), 10)
        : undefined,
    };

    if (!payload.tglProduksi || !payload.idMesin) {
      return { status: "error", message: "Tanggal dan mesin harus diisi" };
    }
    if (payload.idOperators.length === 0) {
      return { status: "error", message: "Operator harus dipilih" };
    }
    if (!payload.idCetakan || !payload.idWarna) {
      return { status: "error", message: "Cetakan dan warna harus dipilih" };
    }

    const created = await createInject(token, payload);
    revalidatePath("/production/inject");
    return {
      status: "success",
      message: `No. Produksi ${created.noProduksi} berhasil dibuat.`,
      noProduksi: created.noProduksi,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function updateInjectAction(
  noProduksi: string,
  payload: UpdateInjectPayload,
): Promise<InjectFormState> {
  try {
    const token = await getToken();
    const updated = await updateInject(token, noProduksi, payload);
    revalidatePath("/production/inject");
    revalidatePath(`/production/inject/${noProduksi}`);
    return {
      status: "success",
      message: `No. Produksi ${updated.noProduksi} berhasil diperbarui.`,
      noProduksi: updated.noProduksi,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function deleteInjectAction(
  noProduksi: string,
): Promise<InjectFormState> {
  try {
    const token = await getToken();
    await deleteInject(token, noProduksi);
    revalidatePath("/production/inject");
    return {
      status: "success",
      message: `No. Produksi ${noProduksi} berhasil dihapus.`,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function completeInjectAction(
  noProduksi: string,
): Promise<InjectFormState> {
  try {
    const token = await getToken();
    await completeInject(token, noProduksi);
    revalidatePath(`/production/inject/${noProduksi}`);
    return { status: "success", message: "Produksi berhasil diselesaikan." };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function uncompleteInjectAction(
  noProduksi: string,
): Promise<InjectFormState> {
  try {
    const token = await getToken();
    await uncompleteInject(token, noProduksi);
    revalidatePath(`/production/inject/${noProduksi}`);
    return { status: "success", message: "Kunci produksi berhasil dibuka." };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function splitInjectTimeAction(params: {
  idMesin: number;
  tanggal: string;
  hourStart: string;
  idCetakan: number;
  idWarna: number;
  idFurnitureMaterial?: number;
  batch?: Record<string, unknown>;
}): Promise<{
  status: "success" | "error";
  message?: string;
  noProduksi?: string;
}> {
  try {
    const token = await getToken();
    const result = await splitInjectTime(token, params.idMesin, params.tanggal, {
      hourStart: params.hourStart,
      idCetakan: params.idCetakan,
      idWarna: params.idWarna,
      idFurnitureMaterial: params.idFurnitureMaterial,
      batch: params.batch,
    });
    revalidatePath("/production/inject");
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

export async function getInjectInputsAction(noProduksi: string) {
  try {
    const token = await getToken();
    const inputs = await fetchInjectInputs(token, noProduksi);
    return { ok: true as const, inputs };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getInjectOutputsAction(noProduksi: string) {
  try {
    const token = await getToken();
    const outputs = await fetchInjectOutputs(token, noProduksi);
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

export async function submitInjectInputsAction(
  noProduksi: string,
  payload: SubmitInputsPayload,
): Promise<InjectFormState> {
  try {
    const token = await getToken();
    await submitInjectInputs(token, noProduksi, payload);
    revalidatePath(`/production/inject/${noProduksi}`);
    return { status: "success", message: "Data berhasil disimpan." };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function deleteInjectInputsAction(
  noProduksi: string,
  payload: SubmitInputsPayload,
): Promise<InjectFormState> {
  try {
    const token = await getToken();
    await deleteInjectInputs(token, noProduksi, payload);
    revalidatePath(`/production/inject/${noProduksi}`);
    return { status: "success", message: "Data berhasil dihapus." };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

// ── Output create ────────────────────────────────────────────────────────────

export async function createInjectBjOutputAction(
  noProduksi: string,
  idBj: number,
  tanggal: string,
  pcs: number,
): Promise<InjectFormState & { noLabel?: string }> {
  try {
    const token = await getToken();
    const noLabel = await createBjOutput(token, noProduksi, idBj, tanggal, pcs);
    revalidatePath(`/production/inject/${noProduksi}`);
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

export async function createInjectBonggolanOutputAction(
  noProduksi: string,
  idBonggolan: number,
  tanggal: string,
  berat: number,
): Promise<InjectFormState & { noLabel?: string }> {
  try {
    const token = await getToken();
    const noLabel = await createBonggolanOutput(
      token,
      noProduksi,
      idBonggolan,
      tanggal,
      berat,
    );
    revalidatePath(`/production/inject/${noProduksi}`);
    return {
      status: "success",
      message: noLabel
        ? `Label ${noLabel} berhasil dibuat.`
        : "Label Bonggolan berhasil dibuat.",
      noProduksi: noLabel,
      noLabel,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function createInjectFwipOutputAction(
  noProduksi: string,
  idJenis: number,
  tanggal: string,
  pcs: number,
): Promise<InjectFormState & { noLabel?: string }> {
  try {
    const token = await getToken();
    const noLabel = await createFwipOutput(token, noProduksi, idJenis, tanggal, pcs);
    revalidatePath(`/production/inject/${noProduksi}`);
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

export async function createInjectRejectOutputAction(
  noProduksi: string,
  idReject: number,
  tanggal: string,
  berat: number,
  jam: string,
): Promise<InjectFormState & { noLabel?: string }> {
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
    revalidatePath(`/production/inject/${noProduksi}`);
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

// ── Realtime: bucket jam / batch ─────────────────────────────────────────────

export async function getInjectPcsPerLabelAction(noProduksi: string) {
  try {
    const token = await getToken();
    return {
      ok: true as const,
      data: await fetchInjectPcsPerLabel(token, noProduksi),
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getInjectBatchAction(noProduksi: string) {
  try {
    const token = await getToken();
    return { ok: true as const, items: await fetchInjectBatch(token, noProduksi) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function submitInjectBatchAction(payload: InjectBatchSubmitPayload) {
  try {
    const token = await getToken();
    const result = await submitInjectBatch(token, payload);
    revalidatePath(`/production/inject/${payload.noProduksi}`);
    return { ok: true as const, result };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function terminateInjectAction(
  noProduksi: string,
  payload: Omit<InjectBatchSubmitPayload, "noProduksi"> & { hourEnd: string },
): Promise<InjectFormState> {
  try {
    const token = await getToken();
    await terminateInject(token, noProduksi, { ...payload });
    revalidatePath("/production/inject");
    revalidatePath(`/production/inject/${noProduksi}`);
    return { status: "success", message: "Produksi berhasil di-terminate." };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function discardInjectPcsPerLabelAction(
  noProduksi: string,
  idJenis: number,
): Promise<InjectFormState> {
  try {
    const token = await getToken();
    await discardInjectPcsPerLabel(token, noProduksi, idJenis);
    return { status: "success" };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

// ── Stok Item (drawer: Furniture WIP + Mixer) ────────────────────────────────

export async function getStokFwipAction() {
  try {
    const token = await getToken();
    return { ok: true as const, items: await fetchInjectStokFwip(token) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getStokFwipLabelsAction(idCabinetWip: number) {
  try {
    const token = await getToken();
    return {
      ok: true as const,
      items: await fetchInjectStokFwipLabels(token, idCabinetWip),
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getStokMixerAction() {
  try {
    const token = await getToken();
    return { ok: true as const, items: await fetchStokMixer(token) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getStokMixerLabelsAction(idMixer: number) {
  try {
    const token = await getToken();
    return { ok: true as const, items: await fetchStokMixerLabel(token, idMixer) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── Output label: print / delete ─────────────────────────────────────────────

export async function printInjectLabelAction(
  category: InjectOutputCategory,
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

export async function deleteInjectLabelAction(
  category: InjectOutputCategory,
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
