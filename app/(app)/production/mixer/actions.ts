"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { ApiRequestError } from "@/services/api";
import {
  createMixer,
  deleteMixer,
  updateMixer,
  completeMixer,
  uncompleteMixer,
  submitMixerInputs,
  deleteMixerInputs,
  createMixerOutput,
  fetchMixerMesin,
  fetchMixerList,
  fetchMixerOne,
  fetchMixerInputs,
  fetchMixerOutputs,
  fetchMixerTypes,
  lookupMixerLabel,
  splitMixerTime,
  markMixerLabelPrinted,
  deleteMixerLabel,
  acquireLabelPrintLock,
  releaseLabelPrintLock,
  fetchMixerLabelPdfBase64,
  type CreateMixerPayload,
  type UpdateMixerPayload,
  type SubmitInputsPayload,
  type FetchMixerListParams,
} from "@/services/mixer-service";
import {
  fetchStokBahanBakuPakai,
  fetchStokBahanBakuPakaiLabel,
  fetchStokBroker,
  fetchStokBrokerLabel,
} from "@/services/stok-service";
import {
  fetchReguList,
  fetchOperatorsByRegu,
  fetchAllOperators,
  fetchMixerShiftHour,
  checkMixerOverlap,
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

export async function getMixerMesinAction() {
  try {
    const token = await getToken();
    return { ok: true as const, ...(await fetchMixerMesin(token)) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── Jenis Mixer ──────────────────────────────────────────────────────────────

export async function getMixerTypesAction() {
  try {
    const token = await getToken();
    const types = await fetchMixerTypes(token);
    return { ok: true as const, types };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── Regu / Operator / Shift / Overlap (form create) ──────────────────────────

const MIXER_ID_BAGIAN = 5;

export async function getReguListAction(idBagian: number = MIXER_ID_BAGIAN) {
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
    const hour = await fetchMixerShiftHour(token, tanggal, shift);
    return { ok: true as const, hour };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function checkMixerOverlapAction(params: {
  date: string;
  idMesin: number;
  start: string;
  end: string;
  exclude?: string;
}) {
  try {
    const token = await getToken();
    const result = await checkMixerOverlap(token, params);
    return { ok: true as const, ...result };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── List ─────────────────────────────────────────────────────────────────────

export async function getMixerListAction(params: FetchMixerListParams = {}) {
  try {
    const token = await getToken();
    return { ok: true as const, ...(await fetchMixerList(token, params)) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getMixerOneAction(noProduksi: string) {
  try {
    const token = await getToken();
    const item = await fetchMixerOne(token, noProduksi);
    return { ok: true as const, item };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export type MixerFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  noProduksi?: string;
};

export async function createMixerAction(
  _prev: MixerFormState,
  formData: FormData,
): Promise<MixerFormState> {
  try {
    const token = await getToken();
    const operatorsRaw = String(formData.get("idOperators") ?? "");
    const idOperators = operatorsRaw
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n) && n !== 0);

    const payload: CreateMixerPayload = {
      tglProduksi: String(formData.get("tglProduksi") ?? formData.get("tanggal") ?? ""),
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

    if (!payload.tglProduksi || !payload.idMesin) {
      return { status: "error", message: "Tanggal dan mesin harus diisi" };
    }
    if (payload.idOperators.length === 0) {
      return { status: "error", message: "Operator harus dipilih" };
    }

    const created = await createMixer(token, payload);
    revalidatePath("/production/mixer");
    return {
      status: "success",
      message: `No. Produksi ${created.noProduksi} berhasil dibuat.`,
      noProduksi: created.noProduksi,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function updateMixerAction(
  noProduksi: string,
  payload: UpdateMixerPayload,
): Promise<MixerFormState> {
  try {
    const token = await getToken();
    const updated = await updateMixer(token, noProduksi, payload);
    revalidatePath("/production/mixer");
    revalidatePath(`/production/mixer/${noProduksi}`);
    return {
      status: "success",
      message: `No. Produksi ${updated.noProduksi} berhasil diperbarui.`,
      noProduksi: updated.noProduksi,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function deleteMixerAction(noProduksi: string): Promise<MixerFormState> {
  try {
    const token = await getToken();
    await deleteMixer(token, noProduksi);
    revalidatePath("/production/mixer");
    return {
      status: "success",
      message: `No. Produksi ${noProduksi} berhasil dihapus.`,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function completeMixerAction(noProduksi: string): Promise<MixerFormState> {
  try {
    const token = await getToken();
    await completeMixer(token, noProduksi);
    revalidatePath(`/production/mixer/${noProduksi}`);
    return { status: "success", message: "Produksi berhasil diselesaikan." };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function uncompleteMixerAction(noProduksi: string): Promise<MixerFormState> {
  try {
    const token = await getToken();
    await uncompleteMixer(token, noProduksi);
    revalidatePath(`/production/mixer/${noProduksi}`);
    return { status: "success", message: "Kunci produksi berhasil dibuka." };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function splitMixerTimeAction(params: {
  idMesin: number;
  tanggal: string;
  hourStart: string;
  outputJenisId: number;
}): Promise<{ status: "success" | "error"; message?: string; noProduksi?: string }> {
  try {
    const token = await getToken();
    const result = await splitMixerTime(token, params.idMesin, params.tanggal, {
      hourStart: params.hourStart,
      outputJenisId: params.outputJenisId,
    });
    revalidatePath("/production/mixer");
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

export async function getMixerInputsAction(noProduksi: string) {
  try {
    const token = await getToken();
    const inputs = await fetchMixerInputs(token, noProduksi);
    return { ok: true as const, inputs };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getMixerOutputsAction(noProduksi: string) {
  try {
    const token = await getToken();
    const outputs = await fetchMixerOutputs(token, noProduksi);
    return { ok: true as const, outputs };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function lookupMixerLabelAction(labelCode: string) {
  try {
    const token = await getToken();
    return { ok: true as const, ...(await lookupMixerLabel(token, labelCode)) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── Inputs submit / delete ───────────────────────────────────────────────────

export async function submitMixerInputsAction(
  noProduksi: string,
  payload: SubmitInputsPayload,
): Promise<MixerFormState> {
  try {
    const token = await getToken();
    await submitMixerInputs(token, noProduksi, payload);
    revalidatePath(`/production/mixer/${noProduksi}`);
    return { status: "success", message: "Data berhasil disimpan." };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function deleteMixerInputsAction(
  noProduksi: string,
  payload: SubmitInputsPayload,
): Promise<MixerFormState> {
  try {
    const token = await getToken();
    await deleteMixerInputs(token, noProduksi, payload);
    revalidatePath(`/production/mixer/${noProduksi}`);
    return { status: "success", message: "Data berhasil dihapus." };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

// ── Output create ────────────────────────────────────────────────────────────

export async function createMixerOutputAction(
  noProduksi: string,
  idJenis: number,
  tanggal: string,
  details: { NoSak: number; Berat: number }[],
): Promise<MixerFormState & { noMixer?: string }> {
  try {
    const token = await getToken();
    const noMixer = await createMixerOutput(token, noProduksi, idJenis, tanggal, details);
    revalidatePath(`/production/mixer/${noProduksi}`);
    return {
      status: "success",
      message: noMixer
        ? `Label ${noMixer} berhasil dibuat.`
        : "Label Mixer berhasil dibuat.",
      noProduksi: noMixer,
      noMixer,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

// ── Stok Item (sidebar drawer: Bahan Baku Pakai + Broker) ────────────────────

export async function getStokBahanBakuPakaiAction() {
  try {
    const token = await getToken();
    return { ok: true as const, items: await fetchStokBahanBakuPakai(token) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getStokBahanBakuPakaiLabelsAction(idBB: number) {
  try {
    const token = await getToken();
    return {
      ok: true as const,
      items: await fetchStokBahanBakuPakaiLabel(token, idBB),
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getStokBrokerAction() {
  try {
    const token = await getToken();
    return { ok: true as const, items: await fetchStokBroker(token) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getStokBrokerLabelsAction(idBroker: number) {
  try {
    const token = await getToken();
    return {
      ok: true as const,
      items: await fetchStokBrokerLabel(token, idBroker),
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── Output label: print / delete ─────────────────────────────────────────────

export async function printMixerLabelAction(noMixer: string) {
  let locked = false;
  try {
    const token = await getToken();
    await acquireLabelPrintLock(token, noMixer);
    locked = true;
    const pdfBase64 = await fetchMixerLabelPdfBase64(token, noMixer);
    const hasBeenPrinted = await markMixerLabelPrinted(token, noMixer);
    await releaseLabelPrintLock(token, noMixer);
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
        await releaseLabelPrintLock(token, noMixer);
      } catch {
        /* best-effort */
      }
    }
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function deleteMixerLabelAction(noMixer: string) {
  try {
    const token = await getToken();
    await deleteMixerLabel(token, noMixer);
    return { ok: true as const, message: `Label ${noMixer} berhasil dihapus.` };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}
