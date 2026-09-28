"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { ApiRequestError } from "@/services/api";
import {
  createGilingan,
  deleteGilingan,
  updateGilingan,
  completeGilingan,
  uncompleteGilingan,
  submitGilinganInputs,
  deleteGilinganInputs,
  createGilinganOutput,
  fetchGilinganMesin,
  fetchGilinganList,
  fetchGilinganOne,
  fetchGilinganInputs,
  fetchGilinganOutputs,
  fetchGilinganTypes,
  lookupGilinganLabel,
  splitGilinganTime,
  markGilinganLabelPrinted,
  deleteGilinganLabel,
  acquireLabelPrintLock,
  releaseLabelPrintLock,
  fetchGilinganLabelPdfBase64,
  type CreateGilinganPayload,
  type UpdateGilinganPayload,
  type SubmitInputsPayload,
  type FetchGilinganListParams,
} from "@/services/gilingan-service";
import { fetchStokReject, fetchStokRejectLabel } from "@/services/stok-service";
import {
  fetchReguList,
  fetchOperatorsByRegu,
  fetchAllOperators,
  fetchGilinganShiftHour,
  checkGilinganOverlap,
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

export async function getGilinganMesinAction() {
  try {
    const token = await getToken();
    return { ok: true as const, ...(await fetchGilinganMesin(token)) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── Jenis Gilingan ───────────────────────────────────────────────────────────

export async function getGilinganTypesAction() {
  try {
    const token = await getToken();
    const types = await fetchGilinganTypes(token);
    return { ok: true as const, types };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── Regu / Operator / Shift / Overlap (form create) ──────────────────────────

const GILINGAN_ID_BAGIAN = 11;

export async function getReguListAction(idBagian: number = GILINGAN_ID_BAGIAN) {
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
    const hour = await fetchGilinganShiftHour(token, tanggal, shift);
    return { ok: true as const, hour };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function checkGilinganOverlapAction(params: {
  date: string;
  idMesin: number;
  start: string;
  end: string;
  exclude?: string;
}) {
  try {
    const token = await getToken();
    const result = await checkGilinganOverlap(token, params);
    return { ok: true as const, ...result };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── List ─────────────────────────────────────────────────────────────────────

export async function getGilinganListAction(
  params: FetchGilinganListParams = {},
) {
  try {
    const token = await getToken();
    return { ok: true as const, ...(await fetchGilinganList(token, params)) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getGilinganOneAction(noProduksi: string) {
  try {
    const token = await getToken();
    const item = await fetchGilinganOne(token, noProduksi);
    return { ok: true as const, item };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export type GilinganFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  noProduksi?: string;
};

export async function createGilinganAction(
  _prev: GilinganFormState,
  formData: FormData,
): Promise<GilinganFormState> {
  try {
    const token = await getToken();
    const operatorsRaw = String(formData.get("idOperators") ?? "");
    const idOperators = operatorsRaw
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n) && n !== 0);

    const payload: CreateGilinganPayload = {
      tglProduksi: String(
        formData.get("tglProduksi") ?? formData.get("tanggal") ?? "",
      ),
      idMesin: parseInt(String(formData.get("idMesin") ?? "0"), 10),
      idOperators,
      jamKerja: String(formData.get("jamKerja") ?? "0"),
      shift: parseInt(String(formData.get("shift") ?? "1"), 10),
      hourStart: String(formData.get("hourStart") ?? "") || undefined,
      hourEnd: String(formData.get("hourEnd") ?? "") || undefined,
      hadir: formData.get("hadir")
        ? parseInt(String(formData.get("hadir")), 10)
        : undefined,
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

    const created = await createGilingan(token, payload);
    revalidatePath("/production/gilingan");
    return {
      status: "success",
      message: `No. Produksi ${created.noProduksi} berhasil dibuat.`,
      noProduksi: created.noProduksi,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function updateGilinganAction(
  noProduksi: string,
  payload: UpdateGilinganPayload,
): Promise<GilinganFormState> {
  try {
    const token = await getToken();
    const updated = await updateGilingan(token, noProduksi, payload);
    revalidatePath("/production/gilingan");
    revalidatePath(`/production/gilingan/${noProduksi}`);
    return {
      status: "success",
      message: `No. Produksi ${updated.noProduksi} berhasil diperbarui.`,
      noProduksi: updated.noProduksi,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function deleteGilinganAction(
  noProduksi: string,
): Promise<GilinganFormState> {
  try {
    const token = await getToken();
    await deleteGilingan(token, noProduksi);
    revalidatePath("/production/gilingan");
    return {
      status: "success",
      message: `No. Produksi ${noProduksi} berhasil dihapus.`,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function completeGilinganAction(
  noProduksi: string,
): Promise<GilinganFormState> {
  try {
    const token = await getToken();
    await completeGilingan(token, noProduksi);
    revalidatePath(`/production/gilingan/${noProduksi}`);
    return { status: "success", message: "Produksi berhasil diselesaikan." };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function uncompleteGilinganAction(
  noProduksi: string,
): Promise<GilinganFormState> {
  try {
    const token = await getToken();
    await uncompleteGilingan(token, noProduksi);
    revalidatePath(`/production/gilingan/${noProduksi}`);
    return { status: "success", message: "Kunci produksi berhasil dibuka." };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function splitGilinganTimeAction(params: {
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
    const result = await splitGilinganTime(token, params.idMesin, params.tanggal, {
      hourStart: params.hourStart,
      outputJenisId: params.outputJenisId,
    });
    revalidatePath("/production/gilingan");
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

export async function getGilinganInputsAction(noProduksi: string) {
  try {
    const token = await getToken();
    const inputs = await fetchGilinganInputs(token, noProduksi);
    return { ok: true as const, inputs };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getGilinganOutputsAction(noProduksi: string) {
  try {
    const token = await getToken();
    const outputs = await fetchGilinganOutputs(token, noProduksi);
    return { ok: true as const, outputs };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function lookupGilinganLabelAction(labelCode: string) {
  try {
    const token = await getToken();
    return {
      ok: true as const,
      ...(await lookupGilinganLabel(token, labelCode)),
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── Inputs submit / delete ───────────────────────────────────────────────────

export async function submitGilinganInputsAction(
  noProduksi: string,
  payload: SubmitInputsPayload,
): Promise<GilinganFormState> {
  try {
    const token = await getToken();
    await submitGilinganInputs(token, noProduksi, payload);
    revalidatePath(`/production/gilingan/${noProduksi}`);
    return { status: "success", message: "Data berhasil disimpan." };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

export async function deleteGilinganInputsAction(
  noProduksi: string,
  payload: SubmitInputsPayload,
): Promise<GilinganFormState> {
  try {
    const token = await getToken();
    await deleteGilinganInputs(token, noProduksi, payload);
    revalidatePath(`/production/gilingan/${noProduksi}`);
    return { status: "success", message: "Data berhasil dihapus." };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

// ── Output create ────────────────────────────────────────────────────────────

export async function createGilinganOutputAction(
  noProduksi: string,
  idJenis: number,
  tanggal: string,
  berat: number,
): Promise<GilinganFormState & { noGilingan?: string }> {
  try {
    const token = await getToken();
    const noGilingan = await createGilinganOutput(
      token,
      noProduksi,
      idJenis,
      tanggal,
      berat,
    );
    revalidatePath(`/production/gilingan/${noProduksi}`);
    return {
      status: "success",
      message: noGilingan
        ? `Label ${noGilingan} berhasil dibuat.`
        : "Label Gilingan berhasil dibuat.",
      noProduksi: noGilingan,
      noGilingan,
    };
  } catch (e) {
    return { status: "error", message: errMsg(e) };
  }
}

// ── Stok Item (sidebar drawer: Reject only — tablet) ─────────────────────────

export async function getStokRejectAction() {
  try {
    const token = await getToken();
    return { ok: true as const, items: await fetchStokReject(token) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getStokRejectLabelsAction(idReject: number) {
  try {
    const token = await getToken();
    return {
      ok: true as const,
      items: await fetchStokRejectLabel(token, idReject),
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

// ── Output label: print / delete ─────────────────────────────────────────────

export async function printGilinganLabelAction(noGilingan: string) {
  let locked = false;
  try {
    const token = await getToken();
    await acquireLabelPrintLock(token, noGilingan);
    locked = true;
    const pdfBase64 = await fetchGilinganLabelPdfBase64(token, noGilingan);
    const hasBeenPrinted = await markGilinganLabelPrinted(token, noGilingan);
    await releaseLabelPrintLock(token, noGilingan);
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
        await releaseLabelPrintLock(token, noGilingan);
      } catch {
        /* best-effort */
      }
    }
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function deleteGilinganLabelAction(noGilingan: string) {
  try {
    const token = await getToken();
    await deleteGilinganLabel(token, noGilingan);
    return {
      ok: true as const,
      message: `Label ${noGilingan} berhasil dihapus.`,
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}
