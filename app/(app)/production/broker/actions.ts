"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { ApiRequestError } from "@/services/api";
import {
  createBroker,
  deleteBroker,
  updateBroker,
  completeBroker,
  uncompleteBroker,
  submitBrokerInputs,
  deleteBrokerInputs,
  createBrokerOutput,
  createBonggolanOutput,
  fetchBrokerMesin,
  fetchBrokerList,
  fetchBrokerOne,
  fetchBrokerInputs,
  fetchBrokerOutputs,
  fetchBonggolanOutputs,
  fetchBrokerFormula,
  fetchBrokerTypes,
  lookupBrokerLabel,
  splitBrokerTime,
  markBrokerLabelPrinted,
  markBonggolanLabelPrinted,
  deleteBrokerLabel,
  deleteBonggolanLabel,
  acquireLabelPrintLock,
  releaseLabelPrintLock,
  fetchBrokerLabelPdfBase64,
  fetchBonggolanLabelPdfBase64,
  type CreateBrokerPayload,
  type UpdateBrokerPayload,
  type SubmitInputsPayload,
  type FetchBrokerListParams,
} from "@/services/broker-service";
import {
  fetchStokWashing,
  fetchStokWashingLabel,
  fetchStokCrusher,
  fetchStokCrusherLabel,
  fetchStokBonggolan,
} from "@/services/stok-service";
import {
  fetchReguList,
  fetchOperatorsByRegu,
  fetchAllOperators,
  fetchShiftHour,
  checkBrokerOverlap,
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

export async function getBrokerMesinAction() {
  try {
    const token = await getToken();
    return { ok: true as const, ...(await fetchBrokerMesin(token)) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── Jenis Broker ─────────────────────────────────────────────────────────────

export async function getBrokerTypesAction() {
  try {
    const token = await getToken();
    const types = await fetchBrokerTypes(token);
    return { ok: true as const, types };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── Regu / Operator / Shift / Overlap (form create) ──────────────────────────

const BROKER_ID_BAGIAN = 2;

export async function getReguListAction(idBagian: number = BROKER_ID_BAGIAN) {
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

export async function checkBrokerOverlapAction(params: {
  date: string;
  idMesin: number;
  start: string;
  end: string;
  exclude?: string;
}) {
  try {
    const token = await getToken();
    const result = await checkBrokerOverlap(token, params);
    return { ok: true as const, ...result };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── List ─────────────────────────────────────────────────────────────────────

export async function getBrokerListAction(params: FetchBrokerListParams = {}) {
  try {
    const token = await getToken();
    return { ok: true as const, ...(await fetchBrokerList(token, params)) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getBrokerOneAction(noProduksi: string) {
  try {
    const token = await getToken();
    const item = await fetchBrokerOne(token, noProduksi);
    return { ok: true as const, item };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export type BrokerFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  noProduksi?: string;
};

export async function createBrokerAction(
  _prev: BrokerFormState,
  formData: FormData,
): Promise<BrokerFormState> {
  try {
    const token = await getToken();
    const operatorsRaw = String(formData.get("idOperators") ?? "");
    const idOperators = operatorsRaw
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n) && n !== 0);

    const payload: CreateBrokerPayload = {
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

    const created = await createBroker(token, payload);
    revalidatePath("/production/broker");
    return {
      status: "success",
      message: `No. Produksi ${created.noProduksi} berhasil dibuat.`,
      noProduksi: created.noProduksi,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function updateBrokerAction(
  noProduksi: string,
  payload: UpdateBrokerPayload,
): Promise<BrokerFormState> {
  try {
    const token = await getToken();
    const updated = await updateBroker(token, noProduksi, payload);
    revalidatePath("/production/broker");
    revalidatePath(`/production/broker/${noProduksi}`);
    return {
      status: "success",
      message: `No. Produksi ${updated.noProduksi} berhasil diperbarui.`,
      noProduksi: updated.noProduksi,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function deleteBrokerAction(noProduksi: string): Promise<BrokerFormState> {
  try {
    const token = await getToken();
    await deleteBroker(token, noProduksi);
    revalidatePath("/production/broker");
    return {
      status: "success",
      message: `No. Produksi ${noProduksi} berhasil dihapus.`,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function completeBrokerAction(noProduksi: string): Promise<BrokerFormState> {
  try {
    const token = await getToken();
    await completeBroker(token, noProduksi);
    revalidatePath(`/production/broker/${noProduksi}`);
    return { status: "success", message: "Produksi berhasil diselesaikan." };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function uncompleteBrokerAction(noProduksi: string): Promise<BrokerFormState> {
  try {
    const token = await getToken();
    await uncompleteBroker(token, noProduksi);
    revalidatePath(`/production/broker/${noProduksi}`);
    return { status: "success", message: "Kunci produksi berhasil dibuka." };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function splitBrokerTimeAction(params: {
  idMesin: number;
  tanggal: string;
  hourStart: string;
  outputJenisId: number;
}): Promise<{ status: "success" | "error"; message?: string; noProduksi?: string }> {
  try {
    const token = await getToken();
    const result = await splitBrokerTime(token, params.idMesin, params.tanggal, {
      hourStart: params.hourStart,
      outputJenisId: params.outputJenisId,
    });
    revalidatePath("/production/broker");
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

export async function getBrokerInputsAction(noProduksi: string) {
  try {
    const token = await getToken();
    const inputs = await fetchBrokerInputs(token, noProduksi);
    return { ok: true as const, inputs };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getBrokerOutputsAction(noProduksi: string) {
  try {
    const token = await getToken();
    const outputs = await fetchBrokerOutputs(token, noProduksi);
    return { ok: true as const, outputs };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getBonggolanOutputsAction(noProduksi: string) {
  try {
    const token = await getToken();
    const outputs = await fetchBonggolanOutputs(token, noProduksi);
    return { ok: true as const, outputs };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getBrokerFormulaAction(noProduksi: string) {
  try {
    const token = await getToken();
    const formula = await fetchBrokerFormula(token, noProduksi);
    return {
      ok: true as const,
      kodes: Array.from(formula.kodes),
      outputs: formula.outputs,
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function lookupBrokerLabelAction(labelCode: string) {
  try {
    const token = await getToken();
    return { ok: true as const, ...(await lookupBrokerLabel(token, labelCode)) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── Inputs submit / delete ───────────────────────────────────────────────────

export async function submitBrokerInputsAction(
  noProduksi: string,
  payload: SubmitInputsPayload,
): Promise<BrokerFormState> {
  try {
    const token = await getToken();
    await submitBrokerInputs(token, noProduksi, payload);
    revalidatePath(`/production/broker/${noProduksi}`);
    return { status: "success", message: "Data berhasil disimpan." };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function deleteBrokerInputsAction(
  noProduksi: string,
  payload: SubmitInputsPayload,
): Promise<BrokerFormState> {
  try {
    const token = await getToken();
    await deleteBrokerInputs(token, noProduksi, payload);
    revalidatePath(`/production/broker/${noProduksi}`);
    return { status: "success", message: "Data berhasil dihapus." };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

// ── Output create ────────────────────────────────────────────────────────────

export async function createBrokerOutputAction(
  noProduksi: string,
  idJenis: number,
  tanggal: string,
  details: { NoSak: number; Berat: number }[],
): Promise<BrokerFormState & { noBroker?: string }> {
  try {
    const token = await getToken();
    const noBroker = await createBrokerOutput(token, noProduksi, idJenis, tanggal, details);
    revalidatePath(`/production/broker/${noProduksi}`);
    return {
      status: "success",
      message: noBroker
        ? `Label ${noBroker} berhasil dibuat.`
        : "Label broker berhasil dibuat.",
      noProduksi: noBroker,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function createBonggolanOutputAction(
  noProduksi: string,
  idBonggolan: number,
  tanggal: string,
  berat: number,
): Promise<BrokerFormState & { noBonggolan?: string }> {
  try {
    const token = await getToken();
    const noBonggolan = await createBonggolanOutput(
      token,
      noProduksi,
      idBonggolan,
      tanggal,
      berat,
    );
    revalidatePath(`/production/broker/${noProduksi}`);
    return {
      status: "success",
      message: noBonggolan
        ? `Label ${noBonggolan} berhasil dibuat.`
        : "Label bonggolan berhasil dibuat.",
      noProduksi: noBonggolan,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

// ── Stok Item (sidebar drawer: Washing + Crusher) ────────────────────────────

export async function getStokWashingAction() {
  try {
    const token = await getToken();
    return { ok: true as const, items: await fetchStokWashing(token) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getStokWashingLabelsAction(idWashing: number) {
  try {
    const token = await getToken();
    return {
      ok: true as const,
      items: await fetchStokWashingLabel(token, idWashing),
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getStokCrusherAction() {
  try {
    const token = await getToken();
    return { ok: true as const, items: await fetchStokCrusher(token) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getStokCrusherLabelsAction(idCrusher: number) {
  try {
    const token = await getToken();
    return {
      ok: true as const,
      items: await fetchStokCrusherLabel(token, idCrusher),
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getStokBonggolanAction() {
  try {
    const token = await getToken();
    return { ok: true as const, items: await fetchStokBonggolan(token) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── Output label: print / delete ─────────────────────────────────────────────

export async function printBrokerLabelAction(noBroker: string) {
  let locked = false;
  try {
    const token = await getToken();
    await acquireLabelPrintLock(token, noBroker);
    locked = true;
    const pdfBase64 = await fetchBrokerLabelPdfBase64(token, noBroker);
    const hasBeenPrinted = await markBrokerLabelPrinted(token, noBroker);
    await releaseLabelPrintLock(token, noBroker);
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
        await releaseLabelPrintLock(token, noBroker);
      } catch {
        /* best-effort */
      }
    }
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function printBonggolanLabelAction(noBonggolan: string) {
  let locked = false;
  try {
    const token = await getToken();
    await acquireLabelPrintLock(token, noBonggolan);
    locked = true;
    const pdfBase64 = await fetchBonggolanLabelPdfBase64(token, noBonggolan);
    const hasBeenPrinted = await markBonggolanLabelPrinted(token, noBonggolan);
    await releaseLabelPrintLock(token, noBonggolan);
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
        await releaseLabelPrintLock(token, noBonggolan);
      } catch {
        /* best-effort */
      }
    }
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function deleteBrokerLabelAction(noBroker: string) {
  try {
    const token = await getToken();
    await deleteBrokerLabel(token, noBroker);
    return { ok: true as const, message: `Label ${noBroker} berhasil dihapus.` };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function deleteBonggolanLabelAction(noBonggolan: string) {
  try {
    const token = await getToken();
    await deleteBonggolanLabel(token, noBonggolan);
    return {
      ok: true as const,
      message: `Label ${noBonggolan} berhasil dihapus.`,
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}
