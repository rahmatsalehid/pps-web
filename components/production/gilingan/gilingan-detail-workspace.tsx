"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  GilinganBeratItem,
  GilinganBrokerItem,
  GilinganInputs,
  GilinganOutput,
  GilinganProduction,
  GilinganType,
} from "@/services/gilingan-service";
import type { SubmitInputsPayload } from "@/services/gilingan-service";
import {
  completeGilinganAction,
  deleteGilinganInputsAction,
  getGilinganInputsAction,
  getGilinganListAction,
  getGilinganOneAction,
  getGilinganOutputsAction,
  getGilinganTypesAction,
  lookupGilinganLabelAction,
  splitGilinganTimeAction,
  submitGilinganInputsAction,
  uncompleteGilinganAction,
} from "@/app/(app)/production/gilingan/actions";
import { ConfirmDialog } from "./confirm-dialog";
import { GilinganOutputFormDialog } from "./gilingan-output-form-dialog";
import { GilinganOutputDetailDialog } from "./gilingan-output-detail-dialog";
import {
  GilinganInputLabelDialog,
  type InputLabelGroup,
  type InputSakChip,
} from "./gilingan-input-label-dialog";
import { ProductionFormDialog } from "./production-form-dialog";
import {
  CheckCircleIcon,
  ClipboardIcon,
  FileTextIcon,
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

type InputTab = "broker" | "bonggolan" | "crusher" | "reject";

type OutputTab = "gilingan";

const INPUT_TAB_ORDER: InputTab[] = ["broker", "bonggolan", "crusher", "reject"];

const TAB_LABELS: Record<InputTab, string> = {
  broker: "Broker",
  bonggolan: "Bonggolan",
  crusher: "Crusher",
  reject: "Reject",
};

const SHOW_SAK_METRIC: Record<InputTab, boolean> = {
  broker: true,
  bonggolan: false,
  crusher: false,
  reject: false,
};

const PREFIX_TO_TAB: Record<string, InputTab> = {
  "D.": "broker",
  "M.": "bonggolan",
  "F.": "crusher",
  "BF.": "reject",
};

function extractPrefix(code: string): string {
  const upper = code.trim().toUpperCase();
  if (upper.startsWith("BF.")) return "BF.";
  const i = upper.indexOf(".");
  if (i > 0) return upper.substring(0, i + 1);
  return upper.length >= 2 ? upper.substring(0, 2) : "";
}

function isBrokerPartial(item: GilinganBrokerItem): boolean {
  return (
    item.isPartial === true || (item.noBrokerPartial ?? "").trim().length > 0
  );
}

function isBeratPartial(item: GilinganBeratItem): boolean {
  return item.isPartial === true || (item.noPartial ?? "").trim().length > 0;
}

function sakTitleKey(item: GilinganBrokerItem): string {
  const partial = (item.noBrokerPartial ?? "").trim();
  if (partial) return partial;
  return item.noBroker ?? "-";
}

function beratTitleKey(item: GilinganBeratItem): string {
  const partial = (item.noPartial ?? "").trim();
  if (partial) return partial;
  return item.noLabel ?? "-";
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

type TempStore = {
  broker: GilinganBrokerItem[];
  bonggolan: GilinganBeratItem[];
  crusher: GilinganBeratItem[];
  reject: GilinganBeratItem[];
};

const EMPTY_TEMP: TempStore = {
  broker: [],
  bonggolan: [],
  crusher: [],
  reject: [],
};

export function GilinganDetailWorkspace({
  noProduksi,
  initialHeader,
  canLock = false,
}: {
  noProduksi: string;
  initialHeader: GilinganProduction | null;
  canLock?: boolean;
}) {
  const [header, setHeader] = useState<GilinganProduction | null>(initialHeader);
  const [inputs, setInputs] = useState<GilinganInputs | null>(null);
  const [outputs, setOutputs] = useState<GilinganOutput[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedInputTab, setSelectedInputTab] = useState<InputTab>("broker");
  const [selectedOutputTab, setSelectedOutputTab] = useState<OutputTab>("gilingan");

  const [scanOpen, setScanOpen] = useState(false);
  const [scanCode, setScanCode] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanLoading, setScanLoading] = useState(false);

  const [confirmComplete, setConfirmComplete] = useState(false);
  const [confirmUncomplete, setConfirmUncomplete] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [snack, setSnack] = useState<{ msg: string; color: string } | null>(null);

  const [showClearTemp, setShowClearTemp] = useState(false);

  const [gantiOpen, setGantiOpen] = useState(false);
  const [gantiHour, setGantiHour] = useState("");
  const [gantiJenisId, setGantiJenisId] = useState<number | "">("");
  const [gantiTypes, setGantiTypes] = useState<GilinganType[]>([]);
  const [gantiBusy, setGantiBusy] = useState(false);
  const [gantiError, setGantiError] = useState<string | null>(null);
  const [riwayatOpen, setRiwayatOpen] = useState(false);
  const [riwayatItems, setRiwayatItems] = useState<GilinganProduction[] | null>(null);
  const [riwayatLoading, setRiwayatLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [gilinganOutputFormOpen, setGilinganOutputFormOpen] = useState(false);
  const [selectedGilinganOutput, setSelectedGilinganOutput] =
    useState<GilinganOutput | null>(null);
  const [selectedLabelRef, setSelectedLabelRef] = useState<{
    tab: InputTab;
    key: string;
  } | null>(null);

  const [temp, setTemp] = useState<TempStore>(EMPTY_TEMP);

  const router = useRouter();
  const totalTempCount =
    temp.broker.length +
    temp.bonggolan.length +
    temp.crusher.length +
    temp.reject.length;
  const isLockedOrComplete = header?.isLocked === true || header?.isComplete === true;

  const showSnack = useCallback((msg: string, color = "#16a34a") => {
    setSnack({ msg, color });
    setTimeout(() => setSnack(null), 3000);
  }, []);

  const loadData = useCallback(async () => {
    const [inp, out] = await Promise.all([
      getGilinganInputsAction(noProduksi),
      getGilinganOutputsAction(noProduksi),
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
        getGilinganInputsAction(noProduksi),
        getGilinganOutputsAction(noProduksi),
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

  function handleOpenOutputForm() {
    if (isLockedOrComplete) return;
    if (header?.outputJenisId == null) {
      showSnack(
        "Jenis output belum dikonfigurasi pada produksi ini.",
        "#f59e0b",
      );
      return;
    }
    setGilinganOutputFormOpen(true);
  }

  // -- Status mesin + toolbar helpers -----------------------------------------

  function isWithinTimeRange(h: GilinganProduction | null): boolean {
    if (!h?.tglProduksi || h.isLocked || h.isComplete) return false;
    const now = new Date();
    const [y, m, d] = h.tglProduksi.slice(0, 10).split("-").map(Number);
    if (y !== now.getFullYear() || m !== now.getMonth() + 1 || d !== now.getDate())
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
  const isToday = !!header?.tglProduksi && header.tglProduksi.slice(0, 10) === todayLocal;
  const isActive = !isLockedOrComplete && isWithinTimeRange(header);
  const showGantiRiwayat = isToday && !!header?.tglProduksi;
  const canGanti =
    isActive && header?.idMesin != null && header?.shift != null && !!header?.tglProduksi;

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
      const res = await getGilinganTypesAction();
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
      setGantiError("Jenis gilingan wajib dipilih");
      return;
    }
    setGantiBusy(true);
    setGantiError(null);
    const res = await splitGilinganTimeAction({
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
        router.push(`/production/gilingan/${encodeURIComponent(res.noProduksi)}`);
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
    const res = await getGilinganListAction({
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

  function openReportPdf() {
    window.open(
      `/production/gilingan/${encodeURIComponent(noProduksi)}/laporan/pdf`,
      "_blank",
      "noopener",
    );
  }

  // -- Toolbar actions --------------------------------------------------------

  async function handleComplete() {
    setActionBusy(true);
    setActionError(null);
    const res = await completeGilinganAction(noProduksi);
    setActionBusy(false);
    if (res.status === "success") {
      setConfirmComplete(false);
      showSnack("Produksi berhasil dikunci");
      setHeader((h) => (h ? { ...h, isComplete: true, produksiStatus: "complete" } : h));
    } else {
      setActionError(res.message ?? "Gagal");
    }
  }

  async function handleUncomplete() {
    setActionBusy(true);
    setActionError(null);
    const res = await uncompleteGilinganAction(noProduksi);
    setActionBusy(false);
    if (res.status === "success") {
      setConfirmUncomplete(false);
      showSnack("Kunci produksi dibuka - bisa diubah lagi");
      setHeader((h) => (h ? { ...h, isComplete: false, produksiStatus: "pending" } : h));
    } else {
      setActionError(res.message ?? "Gagal");
    }
  }

  async function handleEditSaved() {
    setEditOpen(false);
    const res = await getGilinganOneAction(noProduksi);
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

    if (temp.broker.length) {
      const full = temp.broker.filter((e) => !isBrokerPartial(e));
      const partial = temp.broker.filter((e) => isBrokerPartial(e));
      if (full.length) {
        payload.broker = full.map((e) => ({
          noBroker: e.noBroker,
          noSak: e.noSak,
        }));
      }
      if (partial.length) {
        const withBerat = partial.filter(
          (e) => (e.noBroker ?? "").trim() && e.noSak != null && e.berat != null,
        );
        const withCode = partial.filter(
          (e) => !(e.noBroker ?? "").trim() || e.noSak == null || e.berat == null,
        );
        const rows: NonNullable<SubmitInputsPayload["brokerPartial"]> = [];
        for (const e of withBerat) {
          rows.push({
            noBroker: e.noBroker,
            noSak: e.noSak,
            berat: e.berat,
          });
        }
        for (const e of withCode) {
          const code = (e.noBrokerPartial ?? "").trim();
          if (code) rows.push({ noBrokerPartial: code });
        }
        if (rows.length) payload.brokerPartial = rows;
      }
    }

    if (temp.bonggolan.length) {
      payload.bonggolan = temp.bonggolan.map((e) => ({ noBonggolan: e.noLabel }));
    }

    if (temp.crusher.length) {
      payload.crusher = temp.crusher.map((e) => ({ noCrusher: e.noLabel }));
    }

    if (temp.reject.length) {
      const full = temp.reject.filter((e) => !isBeratPartial(e));
      const partial = temp.reject.filter((e) => isBeratPartial(e));
      if (full.length) {
        payload.reject = full.map((e) => ({ noReject: e.noLabel }));
      }
      if (partial.length) {
        const withBerat = partial.filter(
          (e) => (e.noLabel ?? "").trim() && e.berat != null,
        );
        const withCode = partial.filter(
          (e) => !(e.noLabel ?? "").trim() || e.berat == null,
        );
        const rows: NonNullable<SubmitInputsPayload["rejectPartial"]> = [];
        for (const e of withBerat) {
          rows.push({ noReject: e.noLabel, berat: e.berat });
        }
        for (const e of withCode) {
          const code = (e.noPartial ?? "").trim();
          if (code) rows.push({ noRejectPartial: code });
        }
        if (rows.length) payload.rejectPartial = rows;
      }
    }

    if (Object.keys(payload).length === 0) {
      showSnack("Tidak ada data valid untuk disimpan.", "#f59e0b");
      return;
    }

    const res = await submitGilinganInputsAction(noProduksi, payload);
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

  // -- Scan / lookup ----------------------------------------------------------

  async function handleScanSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = scanCode.trim();
    if (!code) return;
    setScanLoading(true);
    setScanError(null);

    const prefix = extractPrefix(code);
    const tab = PREFIX_TO_TAB[prefix];
    if (!tab) {
      setScanError(`Prefix label "${prefix}" belum didukung.`);
      setScanLoading(false);
      return;
    }

    const lookup = await lookupGilinganLabelAction(code);
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
      prefix?: string;
    };
    const rows = Array.isArray(body.data) ? body.data : [];
    if (rows.length === 0) {
      setScanError(`Label ${code} tidak memiliki data tersedia.`);
      setScanLoading(false);
      return;
    }

    const asStr = (v: unknown): string | null =>
      v == null || v === "" ? null : String(v);
    const asNum = (v: unknown): number | null => {
      if (v == null || v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const asBool = (v: unknown): boolean | null => {
      if (v == null || v === "") return null;
      if (typeof v === "boolean") return v;
      return Number(v) !== 0;
    };

    if (tab === "broker") {
      const existing = new Set(
        temp.broker.map(
          (s) => `${s.noBroker}|${s.noSak}|${s.noBrokerPartial ?? ""}`,
        ),
      );
      const next: GilinganBrokerItem[] = [];
      for (const row of rows) {
        const item: GilinganBrokerItem = {
          noBroker: asStr(row.noBroker ?? row.NoBroker),
          noSak: asNum(row.noSak ?? row.NoSak),
          noBrokerPartial: asStr(
            row.noPartial ?? row.NoPartial ?? row.noBrokerPartial,
          ),
          berat: asNum(row.berat ?? row.Berat),
          beratAct: asNum(row.beratAct ?? row.BeratAct),
          isPartial: asBool(row.isPartial ?? row.IsPartial),
          idJenis: asNum(row.idJenis ?? row.IdJenis),
          namaJenis: asStr(row.namaJenis ?? row.NamaJenis),
          datetimeInput: asStr(
            row.datetimeInput ?? row.DateUsage ?? row.dateUsage,
          ),
        };
        if (item.noBroker == null || item.noSak == null) {
          setScanError("Data label Broker tidak lengkap (NoSak kosong).");
          setScanLoading(false);
          return;
        }
        const key = `${item.noBroker}|${item.noSak}|${item.noBrokerPartial ?? ""}`;
        if (existing.has(key)) continue;
        existing.add(key);
        next.push(item);
      }
      if (next.length === 0) {
        setScanError("Semua sak pada label sudah ada di temp.");
        setScanLoading(false);
        return;
      }
      setTemp((p) => ({ ...p, broker: [...p.broker, ...next] }));
      showSnack(`${next.length} sak Broker ditambahkan ke temp`);
      setScanOpen(false);
      setScanCode("");
      setScanLoading(false);
      return;
    }

    const fieldKey =
      tab === "bonggolan"
        ? ["noBonggolan", "NoBonggolan"]
        : tab === "crusher"
          ? ["noCrusher", "NoCrusher"]
          : ["noReject", "NoReject"];
    const partialKey =
      tab === "reject"
        ? (["noRejectPartial", "NoRejectPartial", "noPartial"] as const)
        : (["noPartial", "NoPartial"] as const);

    const existing = new Set(
      temp[tab].map((b) => `${b.noPartial ?? ""}|${b.noLabel ?? ""}`),
    );
    const next: GilinganBeratItem[] = [];
    for (const row of rows) {
      const item: GilinganBeratItem = {
        noLabel: asStr(row[fieldKey[0]] ?? row[fieldKey[1]] ?? row.noLabel),
        noPartial: asStr(row[partialKey[0]] ?? row[partialKey[1]]),
        berat: asNum(row.berat ?? row.Berat),
        beratAct: asNum(row.beratAct ?? row.BeratAct),
        isPartial: asBool(row.isPartial ?? row.IsPartial),
        idJenis: asNum(row.idJenis ?? row.IdJenis),
        namaJenis: asStr(row.namaJenis ?? row.NamaJenis),
        datetimeInput: asStr(
          row.datetimeInput ?? row.DateUsage ?? row.dateUsage,
        ),
      };
      if (item.noLabel == null) {
        setScanError(`Data label ${TAB_LABELS[tab]} tidak lengkap.`);
        setScanLoading(false);
        return;
      }
      const key = `${item.noPartial ?? ""}|${item.noLabel ?? ""}`;
      if (existing.has(key)) continue;
      existing.add(key);
      next.push(item);
    }
    if (next.length === 0) {
      setScanError(`Label ${TAB_LABELS[tab]} sudah ada di temp.`);
      setScanLoading(false);
      return;
    }
    setTemp((p) => ({ ...p, [tab]: [...p[tab], ...next] }));
    showSnack(`${next.length} ${TAB_LABELS[tab]} ditambahkan ke temp`);
    setScanOpen(false);
    setScanCode("");
    setScanLoading(false);
  }

  // -- Delete input item ------------------------------------------------------

  async function deleteInputItem(tab: InputTab, item: unknown) {
    const payload: SubmitInputsPayload = {};
    if (tab === "broker") {
      const s = item as GilinganBrokerItem;
      if (isBrokerPartial(s)) {
        const code = (s.noBrokerPartial ?? "").trim();
        if (code) payload.brokerPartial = [{ noBrokerPartial: code }];
      } else {
        payload.broker = [{ noBroker: s.noBroker, noSak: s.noSak }];
      }
    } else if (tab === "bonggolan") {
      const b = item as GilinganBeratItem;
      payload.bonggolan = [{ noBonggolan: b.noLabel }];
    } else if (tab === "crusher") {
      const b = item as GilinganBeratItem;
      payload.crusher = [{ noCrusher: b.noLabel }];
    } else {
      const b = item as GilinganBeratItem;
      if (isBeratPartial(b)) {
        const code = (b.noPartial ?? "").trim();
        if (code) payload.rejectPartial = [{ noRejectPartial: code }];
      } else {
        payload.reject = [{ noReject: b.noLabel }];
      }
    }
    const res = await deleteGilinganInputsAction(noProduksi, payload);
    if (res.status === "success") {
      showSnack("Label berhasil dikeluarkan");
      reload();
    } else {
      showSnack(res.message ?? "Gagal menghapus", "#dc2626");
    }
  }

  // -- Derived totals + grouping per label -----------------------------------

  const allBroker = inputs?.broker ?? [];
  const allBonggolan = inputs?.bonggolan ?? [];
  const allCrusher = inputs?.crusher ?? [];
  const allReject = inputs?.reject ?? [];

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

  function removeTempItem(tab: InputTab, item: unknown) {
    setTemp((p) => ({
      ...p,
      [tab]: p[tab].filter((x) => x !== item),
    }));
  }

  function buildBrokerGroups(): InputLabelGroup[] {
    const marked = markedList(allBroker, temp.broker);
    const groups = groupBy(marked, ({ item }) => sakTitleKey(item));
    return Array.from(groups.entries()).map(([key, entries]) => {
      const hasPartial = entries.some(({ item }) => isBrokerPartial(item));
      const chips: InputSakChip[] = entries.map(({ item, isTemp }, idx) => ({
        id: `${key}-broker-${idx}`,
        label: `Sak ${item.noSak ?? "-"}`,
        berat: item.berat,
        isTemp,
        isPartial: isBrokerPartial(item),
        onDelete:
          isTemp && !isLockedOrComplete
            ? () => removeTempItem("broker", item)
            : !isTemp && !isLockedOrComplete
              ? () => void deleteInputItem("broker", item)
              : undefined,
      }));
      return {
        key,
        title: entries[0]?.item.namaJenis || "-",
        subtitle: key,
        sakCount: entries.length,
        berat: entries.reduce((s, { item }) => s + (item.berat ?? 0), 0),
        hasPartial,
        isTemp: entries.some(({ isTemp }) => isTemp),
        chips,
        showSakMetric: true,
      };
    });
  }

  function buildBeratGroups(
    tab: "bonggolan" | "crusher" | "reject",
    dbItems: readonly GilinganBeratItem[],
  ): InputLabelGroup[] {
    const marked = markedList(dbItems, temp[tab]);
    const groups = groupBy(marked, ({ item }) => beratTitleKey(item));
    return Array.from(groups.entries()).map(([key, entries]) => {
      const hasPartial = entries.some(({ item }) => isBeratPartial(item));
      const chips: InputSakChip[] = entries.map(({ item, isTemp }, idx) => ({
        id: `${key}-${tab}-${idx}`,
        label: (item.noPartial ?? "").trim() || item.noLabel || "-",
        berat: item.berat,
        isTemp,
        isPartial: isBeratPartial(item),
        onDelete:
          isTemp && !isLockedOrComplete
            ? () => removeTempItem(tab, item)
            : !isTemp && !isLockedOrComplete
              ? () => void deleteInputItem(tab, item)
              : undefined,
      }));
      return {
        key,
        title: entries[0]?.item.namaJenis || "-",
        subtitle: key,
        sakCount: entries.length,
        berat: entries.reduce((s, { item }) => s + (item.berat ?? 0), 0),
        hasPartial,
        isTemp: entries.some(({ isTemp }) => isTemp),
        chips,
        showSakMetric: false,
      };
    });
  }

  const brokerGroups = buildBrokerGroups();
  const bonggolanGroups = buildBeratGroups("bonggolan", allBonggolan);
  const crusherGroups = buildBeratGroups("crusher", allCrusher);
  const rejectGroups = buildBeratGroups("reject", allReject);

  const groupsByTab: Record<InputTab, InputLabelGroup[]> = {
    broker: brokerGroups,
    bonggolan: bonggolanGroups,
    crusher: crusherGroups,
    reject: rejectGroups,
  };

  const groupCountByTab: Record<InputTab, number> = {
    broker: brokerGroups.length,
    bonggolan: bonggolanGroups.length,
    crusher: crusherGroups.length,
    reject: rejectGroups.length,
  };

  const activeGroups: InputLabelGroup[] = groupsByTab[selectedInputTab];

  const catStats = (
    labels: number,
    items: readonly { berat?: number | null }[],
    showSak: boolean,
  ) => ({
    labels,
    sak: showSak ? items.length : 0,
    berat: items.reduce((s, i) => s + (i.berat ?? 0), 0),
  });

  const activeCatStats = (() => {
    switch (selectedInputTab) {
      case "broker":
        return catStats(brokerGroups.length, allBroker, true);
      case "bonggolan":
        return catStats(bonggolanGroups.length, allBonggolan, false);
      case "crusher":
        return catStats(crusherGroups.length, allCrusher, false);
      default:
        return catStats(rejectGroups.length, allReject, false);
    }
  })();

  const showActiveSak = SHOW_SAK_METRIC[selectedInputTab];

  const allDbItems = [
    ...allBroker,
    ...allBonggolan,
    ...allCrusher,
    ...allReject,
  ];
  const grandBerat = allDbItems.reduce((s, i) => s + (i.berat ?? 0), 0);
  const grandSak = allBroker.length;
  const totalLabel =
    brokerGroups.length +
    bonggolanGroups.length +
    crusherGroups.length +
    rejectGroups.length;

  const outputTabCount = outputs.length;
  const outputTotalBerat = outputs.reduce((s, o) => s + o.berat, 0);

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
          title="Status produksi gilingan"
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: machineStatusStyle.fg }}
          />
          {machineStatusLabel}
        </span>

        <div className="flex min-w-0 flex-col">
          <span className="truncate text-lg font-extrabold leading-tight text-gray-900 sm:text-xl">
            {header?.outputJenisNama || "Proses Gilingan"}
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
          <button
            type="button"
            onClick={openReportPdf}
            className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            title="Buka laporan hasil produksi harian (PDF)"
          >
            <FileTextIcon className="h-3.5 w-3.5" /> Laporan
          </button>

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
                  totalTempCount > 0 ? "text-red-600 hover:bg-red-50" : "text-gray-300"
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
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> Memuat inputs...
                  </div>
                ) : activeGroups.length === 0 && totalTempCount === 0 ? (
                  <div className="flex h-24 items-center justify-center text-sm text-gray-400">
                    Belum ada data input. Gunakan tombol scan untuk menambah.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                    {activeGroups.map((g) => (
                      <button
                        key={g.key}
                        type="button"
                        onClick={() =>
                          setSelectedLabelRef({
                            tab: selectedInputTab,
                            key: g.key,
                          })
                        }
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
                            {g.showSakMetric ? `${g.sakCount} sak | ` : ""}
                            {g.berat.toFixed(2)} kg
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
                )}
              </div>

              <div
                className="shrink-0 space-y-1 border-t px-3 py-2"
                style={{ borderColor: BORDER, backgroundColor: "#F8F9FB" }}
              >
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-600">
                  <span>
                    {TAB_LABELS[selectedInputTab]}: {activeCatStats.labels} label
                    {showActiveSak ? ` | ${activeCatStats.sak} sak` : ""} |{" "}
                    {activeCatStats.berat.toFixed(2)} kg
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-800">
                    Total: {totalLabel} label | {grandSak} sak |{" "}
                    {grandBerat.toFixed(2)} kg
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setScanError(null);
                      setScanOpen(true);
                    }}
                    disabled={isLockedOrComplete}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow disabled:opacity-40"
                    style={{ backgroundColor: PRIMARY }}
                    title="Scan Label"
                  >
                    <QrCodeIcon className="h-3.5 w-3.5" /> Scan
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
              style={{ backgroundColor: `${OUTPUT_TEAL}14`, color: OUTPUT_TEAL }}
            >
              Output
            </span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 pb-0">
            <div
              className="flex gap-1 rounded-t-xl border px-1.5 pt-1.5"
              style={{ borderColor: `${OUTPUT_TEAL}52`, backgroundColor: "#ECEFF3" }}
            >
              {(["gilingan"] as OutputTab[]).map((tab) => {
                const labels: Record<OutputTab, string> = {
                  gilingan: "Output Gilingan",
                };
                const counts: Record<OutputTab, number> = {
                  gilingan: outputs.length,
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
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> Memuat outputs...
                  </div>
                ) : outputs.length === 0 ? (
                  <div className="flex h-24 items-center justify-center text-sm text-gray-400">
                    Belum ada output
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                    {outputs.map((o) => (
                      <button
                        key={o.noGilingan}
                        type="button"
                        onClick={() => setSelectedGilinganOutput(o)}
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
                          title={o.noGilingan}
                        >
                          {o.noGilingan}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10px] text-gray-700">
                          <span>{o.berat.toFixed(2)} kg</span>
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
                  {outputTabCount > 0 ? (
                    <span>
                      Gilingan: {outputTabCount} label |{" "}
                      {outputTotalBerat.toFixed(2)} kg
                    </span>
                  ) : (
                    <span className="text-gray-400">Belum ada total kategori</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-800">
                    Total: {outputs.length} label | {outputTotalBerat.toFixed(2)} kg
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
      {selectedGilinganOutput && (
        <GilinganOutputDetailDialog
          output={selectedGilinganOutput}
          canModify={!isLockedOrComplete}
          onClose={() => setSelectedGilinganOutput(null)}
          onChanged={() => {
            void getGilinganOutputsAction(noProduksi).then((res) => {
              if (res.ok) {
                setOutputs(res.outputs);
                const fresh = res.outputs.find(
                  (o) => o.noGilingan === selectedGilinganOutput.noGilingan,
                );
                if (fresh) setSelectedGilinganOutput(fresh);
                else setSelectedGilinganOutput(null);
              }
            });
          }}
          onSnack={showSnack}
        />
      )}

      {/* -- Tambah Output Gilingan ----------------------------- */}
      {gilinganOutputFormOpen && header?.outputJenisId != null && (
        <GilinganOutputFormDialog
          noProduksi={noProduksi}
          tglProduksi={header.tglProduksi}
          idJenis={header.outputJenisId}
          namaJenis={header.outputJenisNama ?? ""}
          namaMesin={header.namaMesin}
          onClose={() => setGilinganOutputFormOpen(false)}
          onSaved={(noGilingan) => {
            setGilinganOutputFormOpen(false);
            showSnack(
              noGilingan
                ? `Label ${noGilingan} berhasil dibuat.`
                : "Label Gilingan berhasil dibuat.",
            );
            void getGilinganOutputsAction(noProduksi).then((res) => {
              if (res.ok) setOutputs(res.outputs);
            });
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
              style={{ background: `linear-gradient(90deg, ${PRIMARY}, #1565C0)` }}
            >
              <div className="flex items-center gap-2">
                <QrCodeIcon className="h-5 w-5" />
                <div>
                  <p className="text-sm font-bold">Scan Label</p>
                  <p className="text-[11px] opacity-80">FULL PALLET</p>
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
                Masukkan atau scan kode label (contoh: D.XXXXXXXXXX / M.XXXXXXXXXX /
                F.XXXXXXXXXX / BF.XXXXXXXXXX)
              </p>
              <input
                autoFocus
                value={scanCode}
                onChange={(e) => setScanCode(e.target.value)}
                placeholder="X.XXXXXXXXXX"
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
                  {scanLoading && <Loader2Icon className="h-4 w-4 animate-spin" />}
                  Tambah
                </button>
              </div>
            </div>
          </form>
        </div>
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
                  Jenis Gilingan
                </span>
                <select
                  value={gantiJenisId}
                  onChange={(e) =>
                    setGantiJenisId(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">- Pilih jenis -</option>
                  {gantiTypes.map((t) => (
                    <option key={t.idGilingan} value={t.idGilingan}>
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
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> Memuat riwayat...
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
      {selectedLabelRef &&
        (() => {
          const liveGroup = (groupsByTab[selectedLabelRef.tab] ?? []).find(
            (g) => g.key === selectedLabelRef.key,
          );
          if (!liveGroup) return null;
          return (
            <GilinganInputLabelDialog
              group={liveGroup}
              canModify={!isLockedOrComplete}
              onClose={() => setSelectedLabelRef(null)}
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
}
