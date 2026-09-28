"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CabinetMaterialMaster,
  SpannerFwipInputItem,
  SpannerInputs,
  SpannerMaterialInputItem,
  SpannerOutput,
  SpannerProduction,
  SpannerType,
} from "@/services/spanner-service";
import type { SubmitInputsPayload } from "@/services/spanner-service";
import {
  completeSpannerAction,
  deleteSpannerInputsAction,
  getCabinetMaterialsAction,
  getSpannerInputsAction,
  getSpannerListAction,
  getSpannerOneAction,
  getSpannerOutputsAction,
  getSpannerTypesAction,
  lookupFwipLabelAction,
  splitSpannerTimeAction,
  submitSpannerInputsAction,
  uncompleteSpannerAction,
} from "@/app/(app)/production/spanner/actions";
import { ConfirmDialog } from "./confirm-dialog";
import { SpannerOutputFormDialog } from "./spanner-output-form-dialog";
import { SpannerRejectOutputDialog } from "./spanner-reject-output-dialog";
import { SpannerOutputDetailDialog } from "./spanner-output-detail-dialog";
import {
  SpannerInputLabelDialog,
  type InputLabelGroup,
  type InputSakChip,
} from "./spanner-input-label-dialog";
import { ProductionFormDialog } from "./production-form-dialog";
import {
  CheckCircleIcon,
  ClipboardIcon,
  HistoryIcon,
  Loader2Icon,
  LockIcon,
  PlusIcon,
  QrCodeIcon,
  RotateCcwIcon,
  TrashIcon,
  X,
} from "@/components/dashboard/icons";

const PRIMARY = "#0277BD";
const OUTPUT_TEAL = "#00796B";
const BORDER = "#E2E6EA";

type InputTab = "fwip" | "material";

type OutputTab = "fwip" | "reject";

const INPUT_TAB_ORDER: InputTab[] = ["fwip", "material"];

const TAB_LABELS: Record<InputTab, string> = {
  fwip: "Furniture WIP",
  material: "Material Kabinet",
};

/** Item temp tab Furniture WIP (sebelum disimpan). */
type TempFwip = {
  noFurnitureWip: string | null;
  noFurnitureWipPartial: string | null;
  pcs: number | null;
  pcsHeader: number | null;
  isPartialRow: boolean;
  idJenis: number | null;
  namaJenis: string | null;
};

/** Item temp tab Material Kabinet (sebelum disimpan). */
type TempMaterial = {
  idCabinetMaterial: number;
  nama: string;
  jumlah: number;
  namaUom: string | null;
};

type TempStore = {
  fwip: TempFwip[];
  material: TempMaterial[];
};

const EMPTY_TEMP: TempStore = { fwip: [], material: [] };

/** Key group per label: kode partial (BC.) jika ada, selain itu noFurnitureWIP. */
function fwipTitleKey(item: {
  noFurnitureWip: string | null;
  noFurnitureWipPartial: string | null;
}): string {
  const part = (item.noFurnitureWipPartial ?? "").trim();
  if (part) return part;
  return item.noFurnitureWip ?? "-";
}

function fwipChipLabel(item: {
  noFurnitureWip: string | null;
  noFurnitureWipPartial: string | null;
}): string {
  return fwipTitleKey(item);
}

function groupBy<T, K>(items: readonly T[], keyOf: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = keyOf(item);
    const arr = map.get(k);
    if (arr) arr.push(item);
    else map.set(k, [item]);
  }
  return map;
}

function asStr(v: unknown): string | null {
  if (v == null || v === "") return null;
  return String(v);
}

function asInt(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export function SpannerDetailWorkspace({
  noProduksi,
  initialHeader,
  canLock = false,
}: {
  noProduksi: string;
  initialHeader: SpannerProduction | null;
  canLock?: boolean;
}) {
  const [header, setHeader] = useState<SpannerProduction | null>(initialHeader);
  const [inputs, setInputs] = useState<SpannerInputs | null>(null);
  const [outputs, setOutputs] = useState<SpannerOutput[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedInputTab, setSelectedInputTab] = useState<InputTab>("fwip");
  const [selectedOutputTab, setSelectedOutputTab] = useState<OutputTab>("fwip");

  const [scanOpen, setScanOpen] = useState(false);
  const [scanCode, setScanCode] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanLoading, setScanLoading] = useState(false);

  // Antrian dialog PCS per label hasil scan
  const [pcsQueue, setPcsQueue] = useState<TempFwip[] | null>(null);
  const [pcsIdx, setPcsIdx] = useState(0);
  const [pcsValue, setPcsValue] = useState("");
  const [pcsErr, setPcsErr] = useState<string | null>(null);

  const [materialAddOpen, setMaterialAddOpen] = useState(false);

  const [confirmComplete, setConfirmComplete] = useState(false);
  const [confirmUncomplete, setConfirmUncomplete] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [snack, setSnack] = useState<{ msg: string; color: string } | null>(null);

  const [showClearTemp, setShowClearTemp] = useState(false);

  const [gantiOpen, setGantiOpen] = useState(false);
  const [gantiHour, setGantiHour] = useState("");
  const [gantiJenisId, setGantiJenisId] = useState<number | "">("");
  const [gantiTypes, setGantiTypes] = useState<SpannerType[]>([]);
  const [gantiBusy, setGantiBusy] = useState(false);
  const [gantiError, setGantiError] = useState<string | null>(null);
  const [riwayatOpen, setRiwayatOpen] = useState(false);
  const [riwayatItems, setRiwayatItems] = useState<SpannerProduction[] | null>(
    null,
  );
  const [riwayatLoading, setRiwayatLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [fwipOutputFormOpen, setFwipOutputFormOpen] = useState(false);
  const [rejectOutputFormOpen, setRejectOutputFormOpen] = useState(false);
  const [selectedOutput, setSelectedOutput] = useState<SpannerOutput | null>(
    null,
  );
  const [selectedLabelKey, setSelectedLabelKey] = useState<string | null>(null);

  const [temp, setTemp] = useState<TempStore>(EMPTY_TEMP);

  const router = useRouter();
  const totalTempCount = temp.fwip.length + temp.material.length;
  const isLockedOrComplete =
    header?.isLocked === true || header?.isComplete === true;

  const showSnack = useCallback((msg: string, color = "#16a34a") => {
    setSnack({ msg, color });
    setTimeout(() => setSnack(null), 3000);
  }, []);

  const loadData = useCallback(async () => {
    const [inp, out] = await Promise.all([
      getSpannerInputsAction(noProduksi),
      getSpannerOutputsAction(noProduksi),
    ]);
    setLoadError(inp.ok ? null : inp.error);
    setLoading(false);
    if (inp.ok) setInputs(inp.inputs);
    if (out.ok) setOutputs(out.outputs);
  }, [noProduksi]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [inp, out] = await Promise.all([
        getSpannerInputsAction(noProduksi),
        getSpannerOutputsAction(noProduksi),
      ]);
      if (cancelled) return;
      setLoadError(inp.ok ? null : inp.error);
      setLoading(false);
      if (inp.ok) setInputs(inp.inputs);
      if (out.ok) setOutputs(out.outputs);
    })();
    return () => {
      cancelled = true;
    };
  }, [noProduksi]);

  const reload = useCallback(() => {
    setLoading(true);
    void loadData();
  }, [loadData]);

  function reloadOutputs() {
    void getSpannerOutputsAction(noProduksi).then((res) => {
      if (res.ok) setOutputs(res.outputs);
    });
  }

  function handleOpenOutputForm() {
    if (isLockedOrComplete) return;
    if (selectedOutputTab === "fwip") {
      if (header?.outputJenisId == null) {
        showSnack(
          "Jenis output belum dikonfigurasi pada produksi ini.",
          "#f59e0b",
        );
        return;
      }
      setFwipOutputFormOpen(true);
    } else {
      setRejectOutputFormOpen(true);
    }
  }

  // -- Status mesin + toolbar helpers -----------------------------------------

  function isWithinTimeRange(h: SpannerProduction | null): boolean {
    if (!h?.tglProduksi || h.isLocked || h.isComplete) return false;
    const now = new Date();
    const [y, m, d] = h.tglProduksi.slice(0, 10).split("-").map(Number);
    if (
      y !== now.getFullYear() ||
      m !== now.getMonth() + 1 ||
      d !== now.getDate()
    )
      return false;
    const hStart = (h.hourStart ?? "").trim();
    const hEnd = (h.hourEnd ?? "").trim();
    if (!hStart && !hEnd) return false;
    const toMin = (hhmm: string) => {
      const p = hhmm.split(":");
      if (p.length < 2) return -1;
      const hh = Number(p[0]);
      const mm = Number(p[1]);
      if (!Number.isFinite(hh) || !Number.isFinite(mm)) return -1;
      return hh * 60 + mm;
    };
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const startMin = hStart ? toMin(hStart) : 0;
    const endMin = hEnd ? toMin(hEnd) : 23 * 60 + 59;
    if (startMin < 0 || endMin < 0) return false;
    if (endMin < startMin) return nowMin >= startMin || nowMin <= endMin;
    return nowMin >= startMin && nowMin <= endMin;
  }

  const machineStatusLabel: "Aktif" | "Pending" | "Locked" = isLockedOrComplete
    ? "Locked"
    : isWithinTimeRange(header)
      ? "Aktif"
      : "Pending";

  const machineStatusStyle =
    machineStatusLabel === "Locked"
      ? { bg: "#FFF7ED", fg: "#F97316", border: "#FED7AA" }
      : machineStatusLabel === "Aktif"
        ? { bg: "#ECFDF5", fg: "#059669", border: "#A7F3D0" }
        : { bg: "#FFFBEB", fg: "#D97706", border: "#FDE68A" };

  const todayLocal = (() => {
    const n = new Date();
    const mm = String(n.getMonth() + 1).padStart(2, "0");
    const dd = String(n.getDate()).padStart(2, "0");
    return `${n.getFullYear()}-${mm}-${dd}`;
  })();
  const isToday =
    !!header?.tglProduksi && header.tglProduksi.slice(0, 10) === todayLocal;
  const isActive = !isLockedOrComplete && isWithinTimeRange(header);
  const showGantiRiwayat = isToday && !!header?.tglProduksi;
  const canGanti =
    isActive &&
    header?.idMesin != null &&
    header?.shift != null &&
    !!header?.tglProduksi;

  async function openGanti() {
    if (!header) return;
    setGantiError(null);
    setGantiOpen(true);
    const now = new Date();
    setGantiHour(
      `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    );
    setGantiJenisId(header.outputJenisId ?? "");
    if (gantiTypes.length === 0) {
      const res = await getSpannerTypesAction();
      if (res.ok) setGantiTypes(res.types);
      else setGantiError(res.error);
    }
  }

  async function submitGanti() {
    if (!header) return;
    if (!gantiHour.trim()) {
      setGantiError("Jam mulai wajib diisi");
      return;
    }
    if (gantiJenisId === "") {
      setGantiError("Pilih jenis Furniture WIP terlebih dahulu");
      return;
    }
    setGantiBusy(true);
    setGantiError(null);
    const res = await splitSpannerTimeAction({
      idMesin: header.idMesin,
      tanggal: header.tglProduksi!.slice(0, 10),
      hourStart: gantiHour.trim(),
      outputJenisId: Number(gantiJenisId),
    });
    setGantiBusy(false);
    if (res.status === "success") {
      setGantiOpen(false);
      showSnack(res.message ?? "Ganti produksi berhasil");
      if (res.noProduksi && res.noProduksi !== noProduksi) {
        router.push(`/production/spanner/${encodeURIComponent(res.noProduksi)}`);
      } else {
        reload();
      }
    } else {
      setGantiError(res.message ?? "Gagal ganti produksi");
    }
  }

  async function openRiwayat() {
    if (!header?.tglProduksi) return;
    setRiwayatOpen(true);
    setRiwayatLoading(true);
    setRiwayatItems(null);
    const res = await getSpannerListAction({
      page: 1,
      pageSize: 50,
      idMesin: header.idMesin,
      tanggal: header.tglProduksi.slice(0, 10),
      shift: header.shift,
    });
    setRiwayatLoading(false);
    if (res.ok) setRiwayatItems(res.items);
    else showSnack(res.error, "#dc2626");
  }

  // -- Toolbar actions --------------------------------------------------------

  async function handleComplete() {
    setActionBusy(true);
    setActionError(null);
    const res = await completeSpannerAction(noProduksi);
    setActionBusy(false);
    if (res.status === "success") {
      setConfirmComplete(false);
      showSnack("Produksi berhasil dikunci");
      setHeader((h) =>
        h ? { ...h, isComplete: true, produksiStatus: "complete" } : h,
      );
    } else {
      setActionError(res.message ?? "Gagal");
    }
  }

  async function handleUncomplete() {
    setActionBusy(true);
    setActionError(null);
    const res = await uncompleteSpannerAction(noProduksi);
    setActionBusy(false);
    if (res.status === "success") {
      setConfirmUncomplete(false);
      showSnack("Kunci produksi dibuka - bisa diubah lagi");
      setHeader((h) =>
        h ? { ...h, isComplete: false, produksiStatus: "pending" } : h,
      );
    } else {
      setActionError(res.message ?? "Gagal");
    }
  }

  async function handleEditSaved() {
    setEditOpen(false);
    const res = await getSpannerOneAction(noProduksi);
    if (res.ok && res.item) setHeader(res.item);
    showSnack("Data produksi diperbarui");
    reload();
  }

  async function handleSave() {
    if (totalTempCount === 0) {
      showSnack("Tidak ada data untuk disimpan", "#f59e0b");
      return;
    }

    const payload: SubmitInputsPayload = {};

    const fullFwip = temp.fwip.filter((e) => !e.isPartialRow && e.noFurnitureWip);
    const partialFwip = temp.fwip.filter((e) => e.isPartialRow);
    if (fullFwip.length) {
      payload.furnitureWip = fullFwip.map((e) => ({
        noFurnitureWIP: e.noFurnitureWip,
      }));
    }
    const validPartial = partialFwip.filter(
      (e) => e.noFurnitureWip && e.pcs != null && e.pcs > 0,
    );
    if (validPartial.length) {
      payload.furnitureWipPartial = validPartial.map((e) => ({
        noFurnitureWIP: e.noFurnitureWip,
        pcs: e.pcs ?? 0,
      }));
    }
    if (temp.material.length) {
      payload.cabinetMaterial = temp.material.map((e) => ({
        idCabinetMaterial: e.idCabinetMaterial,
        jumlah: e.jumlah,
      }));
    }

    if (Object.keys(payload).length === 0) {
      showSnack("Tidak ada data valid untuk disimpan.", "#f59e0b");
      return;
    }

    const res = await submitSpannerInputsAction(noProduksi, payload);
    if (res.status === "success") {
      setTemp(EMPTY_TEMP);
      showSnack("Data berhasil disimpan");
      reload();
    } else {
      showSnack(res.message ?? "Gagal menyimpan", "#dc2626");
    }
  }

  function confirmClearTemp() {
    if (totalTempCount === 0) return;
    setShowClearTemp(true);
  }

  function doClearTemp() {
    setTemp(EMPTY_TEMP);
    setShowClearTemp(false);
    showSnack("Semua temp items dihapus");
  }

  // -- Scan / lookup Furniture WIP --------------------------------------------

  async function handleScanSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = scanCode.trim();
    if (!code) return;
    setScanLoading(true);
    setScanError(null);

    const lookup = await lookupFwipLabelAction(code);
    if (!lookup.ok) {
      setScanError(lookup.error ?? "Gagal lookup label");
      setScanLoading(false);
      return;
    }
    if (!lookup.found) {
      setScanError(`Label ${code} tidak ditemukan atau sudah dipakai.`);
      setScanLoading(false);
      return;
    }

    const body = lookup.body as {
      data?: Record<string, unknown>[];
    };
    const rows = Array.isArray(body.data) ? body.data : [];
    if (rows.length === 0) {
      setScanError(`Label ${code} tidak memiliki data tersedia.`);
      setScanLoading(false);
      return;
    }

    const existing = new Set(
      temp.fwip.map((e) => e.noFurnitureWip ?? ""),
    );
    const dbFull = new Set(
      (inputs?.furnitureWip ?? [])
        .filter((x) => !x.isPartialRow)
        .map((x) => x.noFurnitureWip ?? ""),
    );

    const queue: TempFwip[] = [];
    for (const row of rows) {
      const no = asStr(
        row["NoFurnitureWIP"] ?? row["noFurnitureWIP"] ?? row["noFurnitureWip"],
      );
      if (!no) {
        setScanError("Data label Furniture WIP tidak lengkap.");
        setScanLoading(false);
        return;
      }
      if (existing.has(no) || dbFull.has(no)) continue;
      existing.add(no);
      const pcs = asInt(row["Pcs"] ?? row["pcs"]);
      queue.push({
        noFurnitureWip: no,
        noFurnitureWipPartial: null,
        pcs,
        pcsHeader: pcs,
        isPartialRow: false,
        idJenis: asInt(row["IdJenis"] ?? row["idJenis"]),
        namaJenis: asStr(row["NamaJenis"] ?? row["namaJenis"]),
      });
    }

    if (queue.length === 0) {
      setScanError("Label sudah ada di temp.");
      setScanLoading(false);
      return;
    }

    setScanLoading(false);
    setScanOpen(false);
    setScanCode("");
    setPcsQueue(queue);
    setPcsIdx(0);
    setPcsValue(String(queue[0]?.pcsHeader ?? queue[0]?.pcs ?? 0));
    setPcsErr(null);
  }

  function confirmPcsInput() {
    const item = pcsQueue?.[pcsIdx];
    if (!item) return;
    const maxPcs = item.pcsHeader ?? item.pcs ?? 0;
    const pcs = Number.parseInt(pcsValue.trim(), 10);
    if (!Number.isFinite(pcs) || pcs <= 0) {
      setPcsErr("Masukkan angka yang valid");
      return;
    }
    if (pcs > maxPcs) {
      setPcsErr(`Maksimal ${maxPcs} pcs`);
      return;
    }
    const added: TempFwip = {
      ...item,
      pcs,
      isPartialRow: pcs < maxPcs,
    };
    setTemp((p) => ({ ...p, fwip: [...p.fwip, added] }));
    advancePcsQueue(pcsIdx + 1, 1);
  }

  function skipPcsInput() {
    if (!pcsQueue) return;
    advancePcsQueue(pcsIdx + 1, 0);
  }

  function advancePcsQueue(nextIdx: number, addedCount: number) {
    const queue = pcsQueue ?? [];
    if (nextIdx >= queue.length) {
      setPcsQueue(null);
      setPcsIdx(0);
      if (addedCount > 0) {
        showSnack(
          `${addedCount} item Furniture WIP ditambahkan ke temp`,
        );
      }
      return;
    }
    setPcsIdx(nextIdx);
    setPcsValue(String(queue[nextIdx]?.pcsHeader ?? queue[nextIdx]?.pcs ?? 0));
    setPcsErr(null);
  }

  // -- Material Kabinet -------------------------------------------------------

  function addTempMaterial(master: CabinetMaterialMaster, jumlah: number) {
    setTemp((p) => {
      const idx = p.material.findIndex(
        (m) => m.idCabinetMaterial === master.idCabinetMaterial,
      );
      if (idx >= 0) {
        const next = [...p.material];
        next[idx] = { ...next[idx], jumlah };
        return { ...p, material: next };
      }
      return {
        ...p,
        material: [
          ...p.material,
          {
            idCabinetMaterial: master.idCabinetMaterial,
            nama: master.nama,
            jumlah,
            namaUom: master.namaUom,
          },
        ],
      };
    });
    showSnack("Material ditambahkan ke temp");
    setMaterialAddOpen(false);
  }

  // -- Delete input item ------------------------------------------------------

  async function deleteInputItem(tab: InputTab, item: unknown) {
    const payload: SubmitInputsPayload = {};
    if (tab === "fwip") {
      const it = item as SpannerFwipInputItem;
      const partialCode = (it.noFurnitureWipPartial ?? "").trim();
      if (partialCode) {
        payload.furnitureWipPartial = [{ noFurnitureWIPPartial: partialCode }];
      } else if (it.noFurnitureWip) {
        payload.furnitureWip = [{ noFurnitureWIP: it.noFurnitureWip }];
      } else {
        return;
      }
    } else {
      const it = item as SpannerMaterialInputItem;
      if (it.idCabinetMaterial == null) return;
      payload.cabinetMaterial = [{ idCabinetMaterial: it.idCabinetMaterial }];
    }
    const res = await deleteSpannerInputsAction(noProduksi, payload);
    if (res.status === "success") {
      showSnack("Label berhasil dikeluarkan");
      reload();
    } else {
      showSnack(res.message ?? "Gagal menghapus", "#dc2626");
    }
  }

  function removeTempItem(tab: InputTab, item: unknown) {
    if (tab === "fwip") {
      setTemp((p) => ({ ...p, fwip: p.fwip.filter((x) => x !== item) }));
    } else {
      setTemp((p) => ({
        ...p,
        material: p.material.filter((x) => x !== item),
      }));
    }
  }

  // -- Derived totals + grouping per label -----------------------------------

  const allFwip: (SpannerFwipInputItem | TempFwip)[] = [
    ...temp.fwip,
    ...(inputs?.furnitureWip ?? []),
  ];
  const allMaterialRows: (SpannerMaterialInputItem | TempMaterial)[] = [
    ...temp.material,
    ...(inputs?.cabinetMaterial ?? []),
  ];

  type Marked<T> = { item: T; isTemp: boolean };

  function markedList<T>(
    dbItems: readonly T[],
    tempItems: readonly T[],
  ): Marked<T>[] {
    return [
      ...tempItems.map((item) => ({ item, isTemp: true })),
      ...dbItems.map((item) => ({ item, isTemp: false })),
    ];
  }

  function buildFwipGroups(): InputLabelGroup[] {
    const dbItems = inputs?.furnitureWip ?? [];
    const marked = markedList<SpannerFwipInputItem | TempFwip>(
      dbItems,
      temp.fwip,
    );
    const groups = groupBy(marked, ({ item }) => fwipTitleKey(item));
    return Array.from(groups.entries()).map(([key, entries]) => {
      const hasPartial = entries.some(
        ({ item }) => item.isPartialRow === true,
      );
      const chips: InputSakChip[] = entries.map(({ item, isTemp }, idx) => ({
        id: `${key}-fwip-${idx}`,
        label: fwipChipLabel(item),
        pcs: item.pcs ?? null,
        isTemp,
        isPartial: item.isPartialRow === true,
        onDelete:
          isTemp && !isLockedOrComplete
            ? () => removeTempItem("fwip", item)
            : !isTemp && !isLockedOrComplete
              ? () => void deleteInputItem("fwip", item)
              : undefined,
      }));
      return {
        key,
        title: entries[0]?.item.namaJenis || "-",
        subtitle: entries[0]?.item.noFurnitureWip ?? key,
        itemCount: entries.length,
        totalPcs: entries.reduce((s, { item }) => s + (item.pcs ?? 0), 0),
        hasPartial,
        isTemp: entries.some(({ isTemp }) => isTemp),
        chips,
      };
    });
  }

  const fwipGroups = buildFwipGroups();
  const groupCountByTab: Record<InputTab, number> = {
    fwip: fwipGroups.length,
    material: allMaterialRows.length,
  };
  const activeGroups: InputLabelGroup[] =
    selectedInputTab === "fwip" ? fwipGroups : [];

  const fwipPcs = allFwip.reduce((s, i) => s + (i.pcs ?? 0), 0);
  const materialJumlah = allMaterialRows.reduce(
    (s, i) => s + (i.jumlah ?? 0),
    0,
  );
  const totalInputLabel = fwipGroups.length + allMaterialRows.length;
  const totalInputPcs = fwipPcs + materialJumlah;

  const activeCatStats =
    selectedInputTab === "fwip"
      ? { count: fwipGroups.length, value: fwipPcs, unit: "pcs" }
      : {
          count: allMaterialRows.length,
          value: materialJumlah,
          unit: "jumlah",
        };

  // -- Outputs ---------------------------------------------------------------

  const fwipOutputs = outputs.filter((o) => o.category === "fwip");
  const rejectOutputs = outputs.filter((o) => o.category === "reject");
  const activeOutputs =
    selectedOutputTab === "fwip" ? fwipOutputs : rejectOutputs;
  const activeOutputPcs = activeOutputs.reduce((s, o) => s + (o.pcs ?? 0), 0);
  const activeOutputBerat = activeOutputs.reduce(
    (s, o) => s + (o.berat ?? 0),
    0,
  );

  const breadcrumbLabel = header?.namaMesin
    ? `${header.namaMesin} (${noProduksi})`
    : noProduksi;

  const tglShort = header?.tglProduksi?.slice(0, 10) ?? null;
  const tglLabel = tglShort
    ? new Date(`${tglShort}T00:00:00`).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  const currentPcsItem = pcsQueue?.[pcsIdx] ?? null;
  const currentPcsMax = currentPcsItem
    ? (currentPcsItem.pcsHeader ?? currentPcsItem.pcs ?? 0)
    : 0;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      {/* -- Workspace toolbar ----------------------------------- */}
      <div
        className="flex flex-wrap items-center gap-2 border-b px-3 py-2 sm:px-4"
        style={{ borderColor: BORDER, backgroundColor: "#F8F9FB" }}
      >
        <span
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
          style={{
            backgroundColor: machineStatusStyle.bg,
            color: machineStatusStyle.fg,
            borderColor: machineStatusStyle.border,
          }}
          title="Status produksi spanner"
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: machineStatusStyle.fg }}
          />
          {machineStatusLabel}
        </span>

        <div className="flex min-w-0 flex-col">
          <span className="truncate text-lg font-extrabold leading-tight text-gray-900 sm:text-xl">
            {header?.outputJenisNama || "Proses Packing Spanner"}
          </span>
          <span className="truncate text-[11px] text-gray-500">
            {header
              ? [
                  breadcrumbLabel,
                  tglLabel,
                  `Shift ${header.shift}`,
                  header.hourStart && header.hourEnd
                    ? `${header.hourStart} - ${header.hourEnd}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" | ")
              : "Memuat header..."}
          </span>
          {loadError && (
            <span className="truncate text-[11px] font-medium text-red-600">
              {loadError}
            </span>
          )}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {header && !isLockedOrComplete && (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              title="Edit produksi"
            >
              <ClipboardIcon className="h-3.5 w-3.5" /> Edit
            </button>
          )}
          {showGantiRiwayat && canGanti && (
            <button
              type="button"
              onClick={openGanti}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              title="Ganti produksi"
            >
              Ganti
            </button>
          )}
          {showGantiRiwayat && header && (
            <button
              type="button"
              onClick={openRiwayat}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              title="Riwayat shift"
            >
              <HistoryIcon className="h-3.5 w-3.5" /> Riwayat
            </button>
          )}

          {canLock && header && isLockedOrComplete && header.isComplete && (
            <button
              type="button"
              onClick={() => setConfirmUncomplete(true)}
              className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
            >
              <LockIcon className="h-3.5 w-3.5" /> Buka Kunci
            </button>
          )}
          {canLock && header && !isLockedOrComplete && (
            <button
              type="button"
              onClick={() => setConfirmComplete(true)}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <CheckCircleIcon className="h-3.5 w-3.5" /> Kunci
            </button>
          )}
          {header?.isLocked && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-medium text-orange-700">
              <LockIcon className="h-3 w-3" /> Terkunci
            </span>
          )}
          <button
            type="button"
            onClick={reload}
            className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            title="Muat ulang"
          >
            <RotateCcwIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Muat Ulang</span>
          </button>
        </div>
      </div>

      {/* -- Body: Input panel + Output panel -------------------- */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-hidden p-2 lg:grid-cols-2 lg:gap-3 lg:p-3">
        {/* INPUT PANEL */}
        <div
          className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-white"
          style={{ borderColor: BORDER }}
        >
          <div
            className="flex min-h-11 items-center gap-2 border-b px-3 py-2"
            style={{ borderColor: BORDER }}
          >
            <span
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold"
              style={{ backgroundColor: `${PRIMARY}14`, color: PRIMARY }}
            >
              Input
            </span>
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={handleSave}
                disabled={totalTempCount === 0 || isLockedOrComplete}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                style={{ backgroundColor: PRIMARY }}
              >
                Simpan
                {totalTempCount > 0 && (
                  <span className="grid h-4 min-w-4 place-items-center rounded-full bg-white/25 px-1 text-[10px]">
                    {totalTempCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={confirmClearTemp}
                disabled={totalTempCount === 0}
                className={`rounded p-1.5 ${
                  totalTempCount > 0
                    ? "text-red-600 hover:bg-red-50"
                    : "text-gray-300"
                }`}
                title="Hapus Semua Temp"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 pb-0">
            <div
              className="flex gap-1 overflow-x-auto rounded-t-xl border px-1.5 pt-1.5"
              style={{ borderColor: `${PRIMARY}52`, backgroundColor: "#ECEFF3" }}
            >
              {INPUT_TAB_ORDER.map((tab) => {
                const counts = groupCountByTab;
                const active = selectedInputTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSelectedInputTab(tab)}
                    className={`relative shrink-0 rounded-t-lg border px-2.5 text-[11px] font-extrabold transition ${
                      active
                        ? "z-10 -mb-px mt-0 py-1.5"
                        : "mt-1 border-[#C5CAD3] bg-[#DDE1E7] py-1 text-slate-500 hover:text-slate-700"
                    }`}
                    style={
                      active
                        ? {
                            borderColor: `${PRIMARY}52`,
                            backgroundColor: "#fff",
                            color: PRIMARY,
                            boxShadow: `inset 0 -2px 0 #fff`,
                          }
                        : undefined
                    }
                  >
                    {TAB_LABELS[tab]}
                    <span
                      className={`ml-1 rounded-full px-1.5 text-[9px] font-extrabold ${
                        active ? "" : "bg-[#C5CAD3] text-slate-500"
                      }`}
                      style={
                        active
                          ? {
                              backgroundColor: `${PRIMARY}1A`,
                              color: PRIMARY,
                            }
                          : undefined
                      }
                    >
                      {counts[tab]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-b-xl border bg-white"
              style={{ borderColor: `${PRIMARY}52` }}
            >
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                {loading ? (
                  <div className="flex h-24 items-center justify-center text-sm text-gray-400">
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />{" "}
                    Memuat inputs...
                  </div>
                ) : selectedInputTab === "fwip" &&
                  activeGroups.length === 0 &&
                  totalTempCount === 0 ? (
                  <div className="flex h-24 items-center justify-center text-center text-sm text-gray-400">
                    Belum ada data. Gunakan tombol scan untuk menambah label
                    Furniture WIP.
                  </div>
                ) : selectedInputTab === "material" &&
                  allMaterialRows.length === 0 ? (
                  <div className="flex h-24 items-center justify-center text-center text-sm text-gray-400">
                    Belum ada material kabinet. Tambah dengan tombol + di bawah.
                  </div>
                ) : selectedInputTab === "fwip" ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                    {activeGroups.map((g) => (
                      <button
                        key={g.key}
                        type="button"
                        onClick={() => setSelectedLabelKey(g.key)}
                        className="group relative rounded-lg border p-2 text-left transition hover:shadow-sm"
                        style={{
                          borderColor: g.isTemp ? "#FDE68A" : BORDER,
                          backgroundColor: g.isTemp ? "#FFFBEB" : `${PRIMARY}08`,
                        }}
                        title="Lihat detail label"
                      >
                        <p
                          className="truncate pr-6 text-[11px] font-bold leading-tight"
                          style={{ color: g.isTemp ? "#92400E" : PRIMARY }}
                          title={g.title}
                        >
                          {g.title}
                          {g.hasPartial && (
                            <span className="ml-1 rounded bg-orange-100 px-1 text-[9px] text-orange-700">
                              P
                            </span>
                          )}
                        </p>
                        <p
                          className="truncate text-[10px] leading-snug text-gray-600"
                          title={g.subtitle}
                        >
                          {g.subtitle}
                        </p>
                        <div
                          className={`mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10px] ${
                            g.isTemp ? "text-amber-700" : "text-gray-700"
                          }`}
                        >
                          <span>
                            {g.itemCount} label | {g.totalPcs} pcs
                          </span>
                          {g.isTemp && (
                            <span className="rounded bg-amber-100 px-1 text-[9px] text-amber-700">
                              TEMP
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {materialRowList().map((row) => (
                      <li
                        key={row.key}
                        className="flex items-center gap-2 rounded-lg border p-2.5"
                        style={{
                          borderColor: row.isTemp ? "#FDE68A" : BORDER,
                          backgroundColor: row.isTemp ? "#FFFBEB" : `${PRIMARY}08`,
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate text-[11px] font-bold leading-tight"
                            style={{
                              color: row.isTemp ? "#92400E" : PRIMARY,
                            }}
                            title={row.nama}
                          >
                            {row.nama}
                          </p>
                          <p className="mt-0.5 text-[10px] text-gray-600">
                            {row.jumlah} {row.namaUom ?? ""}
                            {row.isTemp && (
                              <span className="ml-1.5 rounded bg-amber-100 px-1 text-[9px] text-amber-700">
                                TEMP
                              </span>
                            )}
                          </p>
                        </div>
                        {!isLockedOrComplete && (
                          <button
                            type="button"
                            onClick={() =>
                              row.isTemp
                                ? removeTempItem("material", row.item)
                                : void deleteInputItem("material", row.item)
                            }
                            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-red-500 hover:bg-red-50"
                            title="Hapus material"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div
                className="shrink-0 space-y-1 border-t px-3 py-2"
                style={{ borderColor: BORDER, backgroundColor: "#F8F9FB" }}
              >
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-600">
                  <span>
                    {TAB_LABELS[selectedInputTab]}: {activeCatStats.count}{" "}
                    {selectedInputTab === "fwip" ? "label" : "item"} |{" "}
                    {activeCatStats.value} {activeCatStats.unit}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-800">
                    Total: {totalInputLabel} item | {totalInputPcs} pcs
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedInputTab === "material") {
                        setMaterialAddOpen(true);
                        return;
                      }
                      setScanError(null);
                      setScanOpen(true);
                    }}
                    disabled={isLockedOrComplete}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow disabled:opacity-40"
                    style={{ backgroundColor: PRIMARY }}
                    title={
                      selectedInputTab === "fwip"
                        ? "Scan Label"
                        : "Tambah Material"
                    }
                  >
                    {selectedInputTab === "fwip" ? (
                      <>
                        <QrCodeIcon className="h-3.5 w-3.5" /> Scan
                      </>
                    ) : (
                      <>
                        <PlusIcon className="h-3.5 w-3.5" /> Tambah
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* OUTPUT PANEL */}
        <div
          className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-white"
          style={{ borderColor: BORDER }}
        >
          <div
            className="flex min-h-11 items-center gap-2 border-b px-3 py-2"
            style={{ borderColor: BORDER }}
          >
            <span
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold"
              style={{
                backgroundColor: `${OUTPUT_TEAL}14`,
                color: OUTPUT_TEAL,
              }}
            >
              Output
            </span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 pb-0">
            <div
              className="flex gap-1 rounded-t-xl border px-1.5 pt-1.5"
              style={{
                borderColor: `${OUTPUT_TEAL}52`,
                backgroundColor: "#ECEFF3",
              }}
            >
              {(["fwip", "reject"] as OutputTab[]).map((tab) => {
                const labels: Record<OutputTab, string> = {
                  fwip: "Furniture WIP",
                  reject: "Reject",
                };
                const counts: Record<OutputTab, number> = {
                  fwip: fwipOutputs.length,
                  reject: rejectOutputs.length,
                };
                const active = selectedOutputTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSelectedOutputTab(tab)}
                    className={`relative rounded-t-lg border px-2.5 text-[11px] font-extrabold transition ${
                      active
                        ? "z-10 -mb-px mt-0 py-1.5"
                        : "mt-1 border-[#C5CAD3] bg-[#DDE1E7] py-1 text-slate-500 hover:text-slate-700"
                    }`}
                    style={
                      active
                        ? {
                            borderColor: `${OUTPUT_TEAL}52`,
                            backgroundColor: "#fff",
                            color: OUTPUT_TEAL,
                            boxShadow: "inset 0 -2px 0 #fff",
                          }
                        : undefined
                    }
                  >
                    {labels[tab]}
                    <span
                      className={`ml-1 rounded-full px-1.5 text-[9px] font-extrabold ${
                        active ? "" : "bg-[#C5CAD3] text-slate-500"
                      }`}
                      style={
                        active
                          ? {
                              backgroundColor: `${OUTPUT_TEAL}1A`,
                              color: OUTPUT_TEAL,
                            }
                          : undefined
                      }
                    >
                      {counts[tab]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-b-xl border bg-white"
              style={{ borderColor: `${OUTPUT_TEAL}52` }}
            >
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                {loading ? (
                  <div className="flex h-24 items-center justify-center text-sm text-gray-400">
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />{" "}
                    Memuat outputs...
                  </div>
                ) : activeOutputs.length === 0 ? (
                  <div className="flex h-24 items-center justify-center text-sm text-gray-400">
                    {selectedOutputTab === "fwip"
                      ? "Belum ada label output Furniture WIP"
                      : "Belum ada label output reject"}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                    {activeOutputs.map((o) => (
                      <button
                        key={`${o.category}-${o.noLabel}`}
                        type="button"
                        onClick={() => setSelectedOutput(o)}
                        className="rounded-lg border p-2 text-left transition hover:shadow-sm"
                        style={{
                          borderColor: BORDER,
                          backgroundColor: `${OUTPUT_TEAL}08`,
                        }}
                        title="Lihat detail label"
                      >
                        <p
                          className="truncate text-[11px] font-bold leading-tight"
                          style={{ color: OUTPUT_TEAL }}
                        >
                          {o.namaJenis}
                        </p>
                        <p
                          className="truncate text-[10px] leading-snug text-gray-600"
                          title={o.noLabel}
                        >
                          {o.noLabel}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10px] text-gray-700">
                          <span>
                            {o.category === "fwip"
                              ? `${o.pcs ?? 0} pcs`
                              : `${(o.berat ?? 0).toFixed(2)} kg`}
                          </span>
                          {o.hasBeenPrinted > 0 && (
                            <span className="rounded bg-green-50 px-1 text-[9px] text-green-700">
                              Printed
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div
                className="shrink-0 space-y-1 border-t px-3 py-2"
                style={{ borderColor: BORDER, backgroundColor: "#F8F9FB" }}
              >
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-600">
                  {activeOutputs.length > 0 ? (
                    <span>
                      {selectedOutputTab === "fwip"
                        ? `Furniture WIP: ${activeOutputs.length} label | ${activeOutputPcs} pcs`
                        : `Reject: ${activeOutputs.length} label | ${activeOutputBerat.toFixed(2)} kg`}
                    </span>
                  ) : (
                    <span className="text-gray-400">
                      Belum ada total kategori
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-800">
                    Total: {outputs.length} label | {fwipPcsOutput()} pcs |{" "}
                    {rejectBeratOutput().toFixed(2)} kg
                  </p>
                  {!isLockedOrComplete && (
                    <button
                      type="button"
                      onClick={handleOpenOutputForm}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-white"
                      style={{ backgroundColor: OUTPUT_TEAL }}
                    >
                      <PlusIcon className="h-3 w-3" /> Tambah Output
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* -- Detail label output -------------------------------- */}
      {selectedOutput && (
        <SpannerOutputDetailDialog
          output={selectedOutput}
          canModify={!isLockedOrComplete}
          onClose={() => setSelectedOutput(null)}
          onChanged={() => {
            void getSpannerOutputsAction(noProduksi).then((res) => {
              if (res.ok) {
                setOutputs(res.outputs);
                const fresh = res.outputs.find(
                  (o) =>
                    o.category === selectedOutput.category &&
                    o.noLabel === selectedOutput.noLabel,
                );
                if (fresh) setSelectedOutput(fresh);
                else setSelectedOutput(null);
              }
            });
          }}
          onSnack={showSnack}
        />
      )}

      {/* -- Tambah Output Furniture WIP ------------------------ */}
      {fwipOutputFormOpen && header?.outputJenisId != null && (
        <SpannerOutputFormDialog
          noProduksi={noProduksi}
          tglProduksi={header.tglProduksi}
          idJenis={header.outputJenisId}
          namaJenis={header.outputJenisNama ?? ""}
          namaMesin={header.namaMesin}
          onClose={() => setFwipOutputFormOpen(false)}
          onSaved={(noLabel) => {
            setFwipOutputFormOpen(false);
            showSnack(
              noLabel
                ? `Label ${noLabel} berhasil dibuat.`
                : "Label Furniture WIP berhasil dibuat.",
            );
            reloadOutputs();
          }}
        />
      )}

      {/* -- Tambah Output Reject ------------------------------- */}
      {rejectOutputFormOpen && header && (
        <SpannerRejectOutputDialog
          noProduksi={noProduksi}
          tglProduksi={header.tglProduksi}
          namaMesin={header.namaMesin}
          onClose={() => setRejectOutputFormOpen(false)}
          onSaved={(noLabel) => {
            setRejectOutputFormOpen(false);
            showSnack(
              noLabel
                ? `Label ${noLabel} berhasil dibuat.`
                : "Label Reject berhasil dibuat.",
            );
            reloadOutputs();
          }}
        />
      )}

      {/* -- Edit Produksi ---------------------------------------- */}
      {editOpen && header && (
        <ProductionFormDialog
          header={header}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            void handleEditSaved();
          }}
        />
      )}

      {/* -- Scan dialog ----------------------------------------- */}
      {scanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            onSubmit={handleScanSubmit}
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div
              className="flex items-center justify-between px-5 py-3 text-white"
              style={{
                background: `linear-gradient(90deg, ${PRIMARY}, #1565C0)`,
              }}
            >
              <div className="flex items-center gap-2">
                <QrCodeIcon className="h-5 w-5" />
                <div>
                  <p className="text-sm font-bold">Scan Label</p>
                  <p className="text-[11px] opacity-80">FURNITURE WIP</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setScanOpen(false)}
                className="rounded p-1 hover:bg-white/15"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5">
              <p className="mb-2 text-xs text-gray-500">
                Masukkan atau scan kode label Furniture WIP (contoh:
                BB.XXXXXXXXXX)
              </p>
              <input
                autoFocus
                value={scanCode}
                onChange={(e) => setScanCode(e.target.value)}
                placeholder="BB.XXXXXXXXXX"
                className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              {scanError && (
                <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {scanError}
                </p>
              )}
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setScanOpen(false)}
                  className="inline-flex h-10 items-center rounded-full border border-gray-300 px-5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={scanLoading || !scanCode.trim()}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full px-6 text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: PRIMARY }}
                >
                  {scanLoading && (
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                  )}
                  Tambah
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* -- Dialog input PCS per label hasil scan --------------- */}
      {currentPcsItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div
              className="flex items-start gap-2.5 px-5 py-3.5 text-white"
              style={{ background: `linear-gradient(90deg, ${PRIMARY}, #1565C0)` }}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/20">
                <QrCodeIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold">
                  {currentPcsItem.noFurnitureWip}
                </p>
                <p className="truncate text-[11px] text-white/80">
                  {currentPcsItem.namaJenis ?? "Furniture WIP"}
                </p>
              </div>
              {pcsQueue && pcsQueue.length > 1 && (
                <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold">
                  {pcsIdx + 1} / {pcsQueue.length}
                </span>
              )}
              <button
                type="button"
                onClick={skipPcsInput}
                className="rounded p-1 hover:bg-white/15"
                aria-label="Lewati"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              <p className="mb-2 text-xs font-semibold text-gray-600">
                Masukkan jumlah yang akan diinput
              </p>
              <div className="relative">
                <input
                  autoFocus
                  inputMode="numeric"
                  value={pcsValue}
                  onChange={(e) => {
                    setPcsValue(e.target.value.replace(/[^0-9]/g, ""));
                    setPcsErr(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmPcsInput();
                  }}
                  className="h-14 w-full rounded-xl border px-4 text-center text-2xl font-extrabold text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  style={{ borderColor: pcsErr ? "#f87171" : BORDER }}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  / {currentPcsMax} pcs
                </span>
              </div>
              {pcsErr && (
                <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {pcsErr}
                </p>
              )}
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={skipPcsInput}
                  className="inline-flex h-10 items-center rounded-full border border-gray-300 px-5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Lewati
                </button>
                <button
                  type="button"
                  onClick={confirmPcsInput}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full px-6 text-sm font-semibold text-white"
                  style={{ backgroundColor: PRIMARY }}
                >
                  Tambah
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -- Dialog tambah material ------------------------------ */}
      {materialAddOpen && (
        <AddMaterialDialog
          temp={temp.material}
          onAdd={addTempMaterial}
          onClose={() => setMaterialAddOpen(false)}
        />
      )}

      {/* -- Complete/Kunci confirm ------------------------------- */}
      {confirmComplete && (
        <ConfirmDialog
          title="Kunci Produksi?"
          confirmLabel="Kunci"
          loading={actionBusy}
          error={actionError}
          onConfirm={handleComplete}
          onCancel={() => {
            setConfirmComplete(false);
            setActionError(null);
          }}
        >
          <p className="text-sm text-gray-700">
            Yakin ingin mengunci produksi {noProduksi}?
            <br />
            Setelah dikunci, produksi tidak dapat diubah.
          </p>
        </ConfirmDialog>
      )}

      {/* -- Uncomplete confirm ---------------------------------- */}
      {confirmUncomplete && (
        <ConfirmDialog
          title="Buka Kunci Produksi?"
          confirmLabel="Buka Kunci"
          loading={actionBusy}
          error={actionError}
          onConfirm={handleUncomplete}
          onCancel={() => {
            setConfirmUncomplete(false);
            setActionError(null);
          }}
        >
          <p className="text-sm text-gray-700">
            Produksi {noProduksi} akan dibuka kembali dan bisa diubah lagi.
            Lanjutkan?
          </p>
        </ConfirmDialog>
      )}

      {/* -- Ganti Produksi dialog ------------------------------- */}
      {gantiOpen && header && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div
              className="flex items-center justify-between px-5 py-3 text-white"
              style={{ background: `linear-gradient(90deg, ${PRIMARY}, #1565C0)` }}
            >
              <div>
                <p className="text-sm font-bold">Ganti Produksi</p>
                <p className="text-[11px] opacity-80">
                  {header.namaMesin} | Shift {header.shift} | {tglLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGantiOpen(false)}
                className="rounded p-1 hover:bg-white/15"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 p-5">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-600">
                  Jam Mulai
                </span>
                <input
                  type="time"
                  value={gantiHour}
                  onChange={(e) => setGantiHour(e.target.value)}
                  className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-600">
                  Jenis Furniture WIP
                </span>
                <select
                  value={gantiJenisId}
                  onChange={(e) =>
                    setGantiJenisId(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">- Pilih jenis -</option>
                  {gantiTypes.map((t) => (
                    <option key={t.idCabinetWip} value={t.idCabinetWip}>
                      {t.nama}
                    </option>
                  ))}
                </select>
              </label>
              {gantiError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {gantiError}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setGantiOpen(false)}
                  disabled={gantiBusy}
                  className="inline-flex h-10 items-center rounded-full border border-gray-300 px-5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={submitGanti}
                  disabled={gantiBusy}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full px-6 text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: PRIMARY }}
                >
                  {gantiBusy && <Loader2Icon className="h-4 w-4 animate-spin" />}
                  Ganti Produksi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -- Riwayat shift dialog -------------------------------- */}
      {riwayatOpen && header && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div
              className="flex items-center justify-between px-5 py-3 text-white"
              style={{ backgroundColor: PRIMARY }}
            >
              <div>
                <p className="text-sm font-bold">Riwayat Produksi</p>
                <p className="text-[11px] opacity-80">
                  {header.namaMesin} | Shift {header.shift} | {tglLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRiwayatOpen(false)}
                className="rounded p-1 hover:bg-white/15"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {riwayatLoading || riwayatItems == null ? (
                <div className="flex h-24 items-center justify-center text-sm text-gray-400">
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> Memuat
                  riwayat...
                </div>
              ) : riwayatItems.length === 0 ? (
                <div className="flex h-24 items-center justify-center text-sm text-gray-400">
                  Tidak ada riwayat untuk shift ini
                </div>
              ) : (
                <ul className="space-y-2">
                  {riwayatItems.map((item) => {
                    const isCurrent = item.noProduksi === noProduksi;
                    return (
                      <li
                        key={item.noProduksi}
                        className={`rounded-xl border px-3 py-2.5 ${
                          isCurrent
                            ? "border-blue-200 bg-blue-50"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-xs font-bold ${
                              isCurrent ? "text-blue-700" : "text-gray-900"
                            }`}
                          >
                            {item.noProduksi}
                          </span>
                          {isCurrent ? (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                              Sedang berlangsung
                            </span>
                          ) : item.isLocked ? (
                            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                              Locked
                            </span>
                          ) : item.isComplete ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              Complete
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-gray-500">
                          {item.outputJenisNama ?? "-"} |{" "}
                          {item.hourStart && item.hourEnd
                            ? `${item.hourStart} - ${item.hourEnd}`
                            : "Jam belum diatur"}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -- Dialog detail label input --------------------------- */}
      {selectedLabelKey &&
        (() => {
          const liveGroup = fwipGroups.find((g) => g.key === selectedLabelKey);
          if (!liveGroup) return null;
          return (
            <SpannerInputLabelDialog
              group={liveGroup}
              canModify={!isLockedOrComplete}
              onClose={() => setSelectedLabelKey(null)}
            />
          );
        })()}

      {/* -- Clear temp confirm ---------------------------------- */}
      {showClearTemp && (
        <ConfirmDialog
          title="Hapus Semua Temp?"
          confirmLabel="Hapus"
          onConfirm={doClearTemp}
          onCancel={() => setShowClearTemp(false)}
        >
          <p className="text-sm text-gray-700">
            Apakah Anda yakin ingin menghapus {totalTempCount} item temp?
          </p>
        </ConfirmDialog>
      )}

      {/* -- Snack ----------------------------------------------- */}
      {snack && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2">
          <div
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg"
            style={{ backgroundColor: snack.color }}
          >
            {snack.msg}
          </div>
        </div>
      )}
    </div>
  );

  function fwipPcsOutput(): number {
    return fwipOutputs.reduce((s, o) => s + (o.pcs ?? 0), 0);
  }

  function rejectBeratOutput(): number {
    return rejectOutputs.reduce((s, o) => s + (o.berat ?? 0), 0);
  }

  function materialRowList(): {
    key: string;
    item: SpannerMaterialInputItem | TempMaterial;
    nama: string;
    jumlah: number;
    namaUom: string | null;
    isTemp: boolean;
  }[] {
    const dbRows = inputs?.cabinetMaterial ?? [];
    return [
      ...temp.material.map((item, idx) => ({
        key: `temp-mat-${item.idCabinetMaterial}-${idx}`,
        item: item as SpannerMaterialInputItem | TempMaterial,
        nama: item.nama,
        jumlah: item.jumlah,
        namaUom: item.namaUom,
        isTemp: true,
      })),
      ...dbRows.map((item, idx) => ({
        key: `db-mat-${item.idCabinetMaterial ?? idx}-${idx}`,
        item: item as SpannerMaterialInputItem | TempMaterial,
        nama: item.namaJenis ?? `Material ${item.idCabinetMaterial ?? "-"}`,
        jumlah: item.jumlah ?? 0,
        namaUom: item.namaUom,
        isTemp: false,
      })),
    ];
  }
}

/** Dialog pilih material kabinet + jumlah (ala AddCabinetMaterialDialog). */
function AddMaterialDialog({
  temp,
  onAdd,
  onClose,
}: {
  temp: TempMaterial[];
  onAdd: (master: CabinetMaterialMaster, jumlah: number) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<CabinetMaterialMaster[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | "">("");
  const [jumlahText, setJumlahText] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getCabinetMaterialsAction();
      if (cancelled) return;
      if (res.ok) setItems(res.items);
      else setError(res.error);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = (items ?? []).find((m) => m.idCabinetMaterial === selectedId);

  function submit() {
    if (!selected) {
      setErr("Pilih material terlebih dahulu");
      return;
    }
    const jumlah = Number.parseInt(jumlahText.trim(), 10);
    if (!Number.isFinite(jumlah) || jumlah <= 0) {
      setErr("Jumlah harus > 0");
      return;
    }
    onAdd(selected, jumlah);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div
          className="flex items-center justify-between px-5 py-3 text-white"
          style={{ background: `linear-gradient(90deg, ${PRIMARY}, #1565C0)` }}
        >
          <div>
            <p className="text-sm font-bold">Tambah Material Kabinet</p>
            <p className="text-[11px] opacity-80">Warehouse 5</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-white/15"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 p-5">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          ) : items == null ? (
            <div className="flex h-20 items-center justify-center text-sm text-gray-400">
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> Memuat
              material...
            </div>
          ) : (
            <>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-600">
                  Material
                </span>
                <select
                  value={selectedId === "" ? "" : String(selectedId)}
                  onChange={(e) => {
                    setSelectedId(
                      e.target.value === "" ? "" : Number(e.target.value),
                    );
                    setErr(null);
                  }}
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">- Pilih material -</option>
                  {items.map((m) => (
                    <option key={m.idCabinetMaterial} value={m.idCabinetMaterial}>
                      {m.nama}
                      {m.namaUom ? ` (${m.namaUom})` : ""}
                      {temp.some((t) => t.idCabinetMaterial === m.idCabinetMaterial)
                        ? " — sudah di temp"
                        : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-600">
                  Jumlah
                </span>
                <input
                  inputMode="numeric"
                  value={jumlahText}
                  onChange={(e) => {
                    setJumlahText(e.target.value.replace(/[^0-9]/g, ""));
                    setErr(null);
                  }}
                  placeholder="0"
                  className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submit();
                  }}
                />
              </label>
            </>
          )}
          {err && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {err}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center rounded-full border border-gray-300 px-5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={items == null}
              className="inline-flex h-10 items-center gap-1.5 rounded-full px-6 text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: PRIMARY }}
            >
              Tambah
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
