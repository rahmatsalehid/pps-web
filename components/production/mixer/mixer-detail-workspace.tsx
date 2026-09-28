"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  MixerBbItem,
  MixerBeratItem,
  MixerInputs,
  MixerOutput,
  MixerProduction,
  MixerSakItem,
  MixerType,
} from "@/services/mixer-service";
import type { SubmitInputsPayload } from "@/services/mixer-service";
import {
  completeMixerAction,
  deleteMixerInputsAction,
  getMixerInputsAction,
  getMixerListAction,
  getMixerOneAction,
  getMixerOutputsAction,
  getMixerTypesAction,
  lookupMixerLabelAction,
  splitMixerTimeAction,
  submitMixerInputsAction,
  uncompleteMixerAction,
} from "@/app/(app)/production/mixer/actions";
import { ConfirmDialog } from "./confirm-dialog";
import { MixerOutputFormDialog } from "./mixer-output-form-dialog";
import { MixerOutputDetailDialog } from "./mixer-output-detail-dialog";
import {
  MixerInputLabelDialog,
  type InputLabelGroup,
  type InputSakChip,
} from "./mixer-input-label-dialog";
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

type InputTab = "bb" | "broker" | "washing" | "gilingan" | "mixer";

type OutputTab = "mixer";

const INPUT_TAB_ORDER: InputTab[] = [
  "broker",
  "bb",
  "washing",
  "gilingan",
  "mixer",
];

const TAB_LABELS: Record<InputTab, string> = {
  broker: "Broker",
  bb: "BB",
  washing: "Washing",
  gilingan: "Gilingan",
  mixer: "Mixer",
};

const SHOW_SAK_METRIC: Record<InputTab, boolean> = {
  broker: true,
  bb: true,
  washing: true,
  gilingan: false,
  mixer: true,
};

const PREFIX_TO_TAB: Record<string, InputTab> = {
  "A.": "bb",
  "D.": "broker",
  "B.": "washing",
  "V.": "gilingan",
  "H.": "mixer",
};

function extractPrefix(code: string): string {
  const i = code.indexOf(".");
  if (i > 0) return code.substring(0, i + 1).toUpperCase();
  return code.length >= 2 ? code.substring(0, 2).toUpperCase() : "";
}

function isBbPartial(item: MixerBbItem): boolean {
  return item.isPartial === true || (item.noBBPartial ?? "").trim().length > 0;
}

function bbDedupKey(item: MixerBbItem): string {
  const base = `${item.noBahanBaku}|${item.noPallet}|${item.noSak}`;
  if (!isBbPartial(item)) return base;
  return `${base}|${item.berat ?? ""}|${(item.noBBPartial ?? "").trim()}`;
}

function bbTitleKey(item: MixerBbItem): string {
  const partial = (item.noBBPartial ?? "").trim();
  if (partial) return partial;
  const nb = (item.noBahanBaku ?? "").trim();
  const np = item.noPallet;
  const hasNb = nb.length > 0;
  const hasNp = np != null && np > 0;
  if (!hasNb && !hasNp) return "-";
  if (hasNb && hasNp) return `${nb}-${np}`;
  if (hasNb) return nb;
  return `Pallet ${np}`;
}

function bbPairLabel(item: MixerBbItem): string {
  const nb = item.noBahanBaku ?? "-";
  const np = item.noPallet ?? 0;
  return np > 0 ? `${nb}-${np}` : nb;
}

function sakTitleKey(item: MixerSakItem): string {
  const partial = (item.noPartial ?? "").trim();
  if (partial) return partial;
  return item.noLabel ?? "-";
}

function beratTitleKey(item: MixerBeratItem): string {
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
  broker: MixerSakItem[];
  bb: MixerBbItem[];
  washing: MixerSakItem[];
  gilingan: MixerBeratItem[];
  mixer: MixerSakItem[];
};

const EMPTY_TEMP: TempStore = {
  broker: [],
  bb: [],
  washing: [],
  gilingan: [],
  mixer: [],
};

export function MixerDetailWorkspace({
  noProduksi,
  initialHeader,
  canLock = false,
}: {
  noProduksi: string;
  initialHeader: MixerProduction | null;
  canLock?: boolean;
}) {
  const [header, setHeader] = useState<MixerProduction | null>(initialHeader);
  const [inputs, setInputs] = useState<MixerInputs | null>(null);
  const [outputs, setOutputs] = useState<MixerOutput[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedInputTab, setSelectedInputTab] = useState<InputTab>("broker");
  const [selectedOutputTab, setSelectedOutputTab] = useState<OutputTab>("mixer");

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
  const [gantiTypes, setGantiTypes] = useState<MixerType[]>([]);
  const [gantiBusy, setGantiBusy] = useState(false);
  const [gantiError, setGantiError] = useState<string | null>(null);
  const [riwayatOpen, setRiwayatOpen] = useState(false);
  const [riwayatItems, setRiwayatItems] = useState<MixerProduction[] | null>(null);
  const [riwayatLoading, setRiwayatLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [mixerOutputFormOpen, setMixerOutputFormOpen] = useState(false);
  const [selectedMixerOutput, setSelectedMixerOutput] = useState<MixerOutput | null>(null);
  const [selectedLabelRef, setSelectedLabelRef] = useState<{
    tab: InputTab;
    key: string;
  } | null>(null);

  const [temp, setTemp] = useState<TempStore>(EMPTY_TEMP);
  const tempBbPartialSeq = useRef(0);

  function nextTempBbPartialCode(): string {
    tempBbPartialSeq.current += 1;
    return `P.XXXXXXXX (${tempBbPartialSeq.current})`;
  }

  function withTempBbPartial(item: MixerBbItem): MixerBbItem {
    if (isBbPartial(item) && !(item.noBBPartial ?? "").trim()) {
      return { ...item, noBBPartial: nextTempBbPartialCode() };
    }
    return item;
  }

  const router = useRouter();
  const totalTempCount =
    temp.broker.length +
    temp.bb.length +
    temp.washing.length +
    temp.gilingan.length +
    temp.mixer.length;
  const isLockedOrComplete = header?.isLocked === true || header?.isComplete === true;

  const showSnack = useCallback((msg: string, color = "#16a34a") => {
    setSnack({ msg, color });
    setTimeout(() => setSnack(null), 3000);
  }, []);

  const loadData = useCallback(async () => {
    const [inp, out] = await Promise.all([
      getMixerInputsAction(noProduksi),
      getMixerOutputsAction(noProduksi),
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
        getMixerInputsAction(noProduksi),
        getMixerOutputsAction(noProduksi),
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
    setMixerOutputFormOpen(true);
  }

  // ── Status mesin + toolbar helpers ─────────────────────────────────────────

  function isWithinTimeRange(h: MixerProduction | null): boolean {
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
      const res = await getMixerTypesAction();
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
      setGantiError("Jenis mixer wajib dipilih");
      return;
    }
    setGantiBusy(true);
    setGantiError(null);
    const res = await splitMixerTimeAction({
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
        router.push(`/production/mixer/${encodeURIComponent(res.noProduksi)}`);
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
    const res = await getMixerListAction({
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

  // ── Toolbar actions ────────────────────────────────────────────────────────

  async function handleComplete() {
    setActionBusy(true);
    setActionError(null);
    const res = await completeMixerAction(noProduksi);
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
    const res = await uncompleteMixerAction(noProduksi);
    setActionBusy(false);
    if (res.status === "success") {
      setConfirmUncomplete(false);
      showSnack("Kunci produksi dibuka — bisa diubah lagi");
      setHeader((h) => (h ? { ...h, isComplete: false, produksiStatus: "pending" } : h));
    } else {
      setActionError(res.message ?? "Gagal");
    }
  }

  async function handleEditSaved() {
    setEditOpen(false);
    const res = await getMixerOneAction(noProduksi);
    if (res.ok && res.item) setHeader(res.item);
    showSnack("Data produksi diperbarui");
    reload();
  }

  function isSakPartial(item: MixerSakItem): boolean {
    return item.isPartial === true || (item.noPartial ?? "").trim().length > 0;
  }

  function isBeratPartial(item: MixerBeratItem): boolean {
    return item.isPartial === true || (item.noPartial ?? "").trim().length > 0;
  }

  async function handleSave() {
    if (totalTempCount === 0) {
      showSnack("Tidak ada data untuk disimpan", "#f59e0b");
      return;
    }

    if (temp.bb.length) {
      const incomplete = temp.bb.find(
        (e) => e.noBahanBaku == null || e.noPallet == null || e.noSak == null,
      );
      if (incomplete) {
        showSnack(
          `Label bahan baku ${incomplete.noBahanBaku ?? "?"} belum lengkap (NoPallet/NoSak). Scan ulang.`,
          "#dc2626",
        );
        return;
      }
    }
    const sakTabs: Array<"broker" | "mixer"> = ["broker", "mixer"];
    for (const tab of sakTabs) {
      const incomplete = temp[tab].find((e) => e.noLabel == null || e.noSak == null);
      if (incomplete) {
        showSnack(
          `Label ${TAB_LABELS[tab]} ${incomplete.noLabel ?? "?"} belum lengkap (NoSak kosong). Scan ulang.`,
          "#dc2626",
        );
        return;
      }
    }
    const beratTabs: Array<"gilingan"> = ["gilingan"];
    for (const tab of beratTabs) {
      const incomplete = temp[tab].find((e) => e.noLabel == null);
      if (incomplete) {
        showSnack(
          `Label ${TAB_LABELS[tab]} tidak valid. Scan ulang.`,
          "#dc2626",
        );
        return;
      }
    }

    const payload: Record<string, unknown[]> = {};

    if (temp.broker.length) {
      const full = temp.broker.filter((e) => !isSakPartial(e));
      const partial = temp.broker.filter((e) => isSakPartial(e));
      if (full.length) {
        payload.broker = full.map((e) => ({ noBroker: e.noLabel, noSak: e.noSak }));
      }
      if (partial.length) {
        payload.brokerPartial = partial.map((e) => ({
          noBroker: e.noLabel,
          noSak: e.noSak,
          berat: e.berat,
        }));
      }
    }
    if (temp.bb.length) {
      const full = temp.bb.filter((e) => !isBbPartial(e));
      const partial = temp.bb.filter((e) => isBbPartial(e));
      if (full.length) {
        payload.bb = full.map((e) => ({
          noBahanBaku: e.noBahanBaku,
          noPallet: e.noPallet,
          noSak: e.noSak,
        }));
      }
      if (partial.length) {
        payload.bbPartial = partial.map((e) => ({
          noBahanBaku: e.noBahanBaku,
          noPallet: e.noPallet,
          noSak: e.noSak,
          berat: e.berat,
        }));
      }
    }
    if (temp.gilingan.length) {
      const full = temp.gilingan.filter((e) => !isBeratPartial(e));
      const partial = temp.gilingan.filter((e) => isBeratPartial(e));
      if (full.length) {
        payload.gilingan = full.map((e) => ({ noGilingan: e.noLabel }));
      }
      if (partial.length) {
        payload.gilinganPartial = partial.map((e) => ({
          noGilingan: e.noLabel,
          berat: e.berat,
        }));
      }
    }
    if (temp.mixer.length) {
      const full = temp.mixer.filter((e) => !isSakPartial(e));
      const partial = temp.mixer.filter((e) => isSakPartial(e));
      if (full.length) {
        payload.mixer = full.map((e) => ({ noMixer: e.noLabel, noSak: e.noSak }));
      }
      if (partial.length) {
        payload.mixerPartial = partial.map((e) => ({
          noMixer: e.noLabel,
          noSak: e.noSak,
          berat: e.berat,
        }));
      }
    }

    if (Object.keys(payload).length === 0) {
      showSnack(
        "Washing belum dapat disimpan (belum didukung backend). Data tetap di temp.",
        "#f59e0b",
      );
      return;
    }

    const res = await submitMixerInputsAction(
      noProduksi,
      payload as SubmitInputsPayload,
    );
    if (res.status === "success") {
      setTemp((p) => ({ ...EMPTY_TEMP, washing: p.washing }));
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

  // ── Scan / lookup ──────────────────────────────────────────────────────────

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

    const lookup = await lookupMixerLabelAction(code);
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

    if (tab === "bb") {
      const existing = new Set<string>();
      for (const b of [...temp.bb, ...(inputs?.bb ?? [])]) existing.add(bbDedupKey(b));
      const next: MixerBbItem[] = [];
      for (const row of rows) {
        let item: MixerBbItem = {
          noBahanBaku: asStr(row.noBahanBaku ?? row.NoBahanBaku),
          noPallet: asNum(row.noPallet ?? row.NoPallet),
          noSak: asNum(row.noSak ?? row.NoSak),
          noBBPartial: asStr(row.noBBPartial ?? row.NoBBPartial),
          berat: asNum(row.berat ?? row.Berat),
          beratAct: asNum(row.beratAct ?? row.BeratAct),
          isPartial: asBool(row.isPartial ?? row.IsPartial),
          dateUsage: asStr(row.dateUsage ?? row.DateUsage),
          idJenis: asNum(row.idJenis ?? row.IdJenis),
          namaJenis: asStr(row.namaJenis ?? row.NamaJenis),
        };
        if (item.noBahanBaku == null || item.noPallet == null || item.noSak == null) {
          setScanError("Data label BB tidak lengkap (NoPallet/NoSak kosong).");
          setScanLoading(false);
          return;
        }
        item = withTempBbPartial(item);
        const key = bbDedupKey(item);
        if (existing.has(key)) continue;
        existing.add(key);
        next.push(item);
      }
      if (next.length === 0) {
        setScanError("Semua sak pada label sudah ada di temp.");
        setScanLoading(false);
        return;
      }
      setTemp((p) => ({ ...p, bb: [...p.bb, ...next] }));
      showSnack(`${next.length} sak bahan baku ditambahkan ke temp`);
      setScanOpen(false);
      setScanCode("");
      setScanLoading(false);
      return;
    }

    if (tab === "broker" || tab === "washing" || tab === "mixer") {
      const existing = new Set(
        temp[tab].map((s) => `${s.noLabel}|${s.noSak}|${s.noPartial ?? ""}`),
      );
      const next: MixerSakItem[] = [];
      for (const row of rows) {
        const item: MixerSakItem = {
          noLabel: asStr(
            row.noBroker ??
              row.noWashing ??
              row.noMixer ??
              row.noLabel ??
              row.NoBroker ??
              row.NoWashing ??
              row.NoMixer,
          ),
          noSak: asNum(row.noSak ?? row.NoSak),
          noPartial: asStr(
            row.noPartial ??
              row.NoPartial ??
              row.noBrokerPartial ??
              row.NoBrokerPartial,
          ),
          berat: asNum(row.berat ?? row.Berat),
          beratAct: asNum(row.beratAct ?? row.BeratAct),
          isPartial: asBool(row.isPartial ?? row.IsPartial),
          idJenis: asNum(row.idJenis ?? row.IdJenis),
          namaJenis: asStr(row.namaJenis ?? row.NamaJenis),
          dateUsage: asStr(row.dateUsage ?? row.DateUsage),
        };
        if (item.noLabel == null || item.noSak == null) {
          setScanError(`Data label ${TAB_LABELS[tab]} tidak lengkap (NoSak kosong).`);
          setScanLoading(false);
          return;
        }
        const key = `${item.noLabel}|${item.noSak}|${item.noPartial ?? ""}`;
        if (existing.has(key)) continue;
        existing.add(key);
        next.push(item);
      }
      if (next.length === 0) {
        setScanError("Semua sak pada label sudah ada di temp.");
        setScanLoading(false);
        return;
      }
      setTemp((p) => ({ ...p, [tab]: [...p[tab], ...next] }));
      showSnack(`${next.length} sak ${TAB_LABELS[tab]} ditambahkan ke temp`);
      setScanOpen(false);
      setScanCode("");
      setScanLoading(false);
      return;
    }

    const existing = new Set(
      temp.gilingan.map((b) => `${b.noPartial ?? ""}|${b.noLabel ?? ""}`),
    );
    const next: MixerBeratItem[] = [];
    for (const row of rows) {
      const item: MixerBeratItem = {
        noLabel: asStr(row.noGilingan ?? row.noLabel ?? row.NoGilingan),
        noPartial: asStr(
          row.noPartial ??
            row.NoPartial ??
            row.noGilinganPartial ??
            row.NoGilinganPartial,
        ),
        berat: asNum(row.berat ?? row.Berat),
        beratAct: asNum(row.beratAct ?? row.BeratAct),
        isPartial: asBool(row.isPartial ?? row.IsPartial),
        idJenis: asNum(row.idJenis ?? row.IdJenis),
        namaJenis: asStr(row.namaJenis ?? row.NamaJenis),
        dateUsage: asStr(row.dateUsage ?? row.DateUsage),
      };
      if (item.noLabel == null) {
        setScanError(`Data label ${TAB_LABELS.gilingan} tidak lengkap.`);
        setScanLoading(false);
        return;
      }
      const key = `${item.noPartial ?? ""}|${item.noLabel ?? ""}`;
      if (existing.has(key)) continue;
      existing.add(key);
      next.push(item);
    }
    if (next.length === 0) {
      setScanError(`Label ${TAB_LABELS.gilingan} sudah ada di temp.`);
      setScanLoading(false);
      return;
    }
    setTemp((p) => ({ ...p, gilingan: [...p.gilingan, ...next] }));
    showSnack(`${next.length} ${TAB_LABELS.gilingan} ditambahkan ke temp`);
    setScanOpen(false);
    setScanCode("");
    setScanLoading(false);
  }

  // ── Delete input item ──────────────────────────────────────────────────────

  async function deleteInputItem(tab: InputTab, item: unknown) {
    const payload: Record<string, unknown[]> = {};
    if (tab === "bb") {
      const b = item as MixerBbItem;
      if (isBbPartial(b)) {
        const code = (b.noBBPartial ?? "").trim();
        if (code) payload.bbPartial = [{ noBBPartial: code }];
      } else {
        payload.bb = [{ noBahanBaku: b.noBahanBaku, noPallet: b.noPallet, noSak: b.noSak }];
      }
    } else if (tab === "broker") {
      const s = item as MixerSakItem;
      if (isSakPartial(s)) {
        const code = (s.noPartial ?? "").trim();
        if (code) payload.brokerPartial = [{ noBrokerPartial: code }];
      } else {
        payload.broker = [{ noBroker: s.noLabel, noSak: s.noSak }];
      }
    } else if (tab === "washing") {
      showSnack(
        "Washing belum dapat dihapus (belum didukung backend).",
        "#f59e0b",
      );
      return;
    } else if (tab === "gilingan") {
      const b = item as MixerBeratItem;
      if (isBeratPartial(b)) {
        const code = (b.noPartial ?? "").trim();
        if (code) payload.gilinganPartial = [{ noGilinganPartial: code }];
      } else {
        payload.gilingan = [{ noGilingan: b.noLabel }];
      }
    } else {
      const s = item as MixerSakItem;
      if (isSakPartial(s)) {
        const code = (s.noPartial ?? "").trim();
        if (code) payload.mixerPartial = [{ noMixerPartial: code }];
      } else {
        payload.mixer = [{ noMixer: s.noLabel, noSak: s.noSak }];
      }
    }
    const res = await deleteMixerInputsAction(
      noProduksi,
      payload as SubmitInputsPayload,
    );
    if (res.status === "success") {
      showSnack("Label berhasil dikeluarkan");
      reload();
    } else {
      showSnack(res.message ?? "Gagal menghapus", "#dc2626");
    }
  }

  // ── Derived totals + grouping per label ───────────────────────────────────

  const allBroker = inputs?.broker ?? [];
  const allBb = inputs?.bb ?? [];
  const allWashing = inputs?.washing ?? [];
  const allGilingan = inputs?.gilingan ?? [];
  const allMixer = inputs?.mixer ?? [];

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

  function buildBbGroups(): InputLabelGroup[] {
    const marked = markedList(allBb, temp.bb);
    const groups = groupBy(marked, ({ item }) => bbTitleKey(item));
    return Array.from(groups.entries()).map(([key, entries]) => {
      const hasPartial = entries.some(({ item }) => isBbPartial(item));
      const firstPartial = entries.find(({ item }) => isBbPartial(item));
      const chips: InputSakChip[] = entries.map(({ item, isTemp }, idx) => ({
        id: `${key}-bb-${idx}`,
        label: `Sak ${item.noSak ?? "-"}`,
        berat: item.berat,
        isTemp,
        isPartial: isBbPartial(item),
        onDelete:
          isTemp && !isLockedOrComplete
            ? () => removeTempItem("bb", item)
            : !isTemp && !isLockedOrComplete
              ? () => void deleteInputItem("bb", item)
              : undefined,
      }));
      return {
        key,
        title: entries[0]?.item.namaJenis || "—",
        subtitle: hasPartial && firstPartial ? bbPairLabel(firstPartial.item) : key,
        sakCount: entries.length,
        berat: entries.reduce((s, { item }) => s + (item.berat ?? 0), 0),
        hasPartial,
        isTemp: entries.some(({ isTemp }) => isTemp),
        chips,
        showSakMetric: true,
      };
    });
  }

  function buildSakGroups(
    tab: "broker" | "washing" | "mixer",
    dbItems: readonly MixerSakItem[],
  ): InputLabelGroup[] {
    const marked = markedList(dbItems, temp[tab]);
    const groups = groupBy(marked, ({ item }) => sakTitleKey(item));
    return Array.from(groups.entries()).map(([key, entries]) => {
      const hasPartial = entries.some(({ item }) => isSakPartial(item));
      const chips: InputSakChip[] = entries.map(({ item, isTemp }, idx) => ({
        id: `${key}-${tab}-${idx}`,
        label: `Sak ${item.noSak ?? "-"}`,
        berat: item.berat,
        isTemp,
        isPartial: isSakPartial(item),
        onDelete:
          isTemp && !isLockedOrComplete
            ? () => removeTempItem(tab, item)
            : !isTemp && !isLockedOrComplete
              ? () => void deleteInputItem(tab, item)
              : undefined,
      }));
      return {
        key,
        title: entries[0]?.item.namaJenis || "—",
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
    tab: "gilingan",
    dbItems: readonly MixerBeratItem[],
  ): InputLabelGroup[] {
    const marked = markedList(dbItems, temp[tab]);
    const groups = groupBy(marked, ({ item }) => beratTitleKey(item));
    return Array.from(groups.entries()).map(([key, entries]) => {
      const hasPartial = entries.some(({ item }) => isBeratPartial(item));
      const chips: InputSakChip[] = entries.map(({ item, isTemp }, idx) => ({
        id: `${key}-${tab}-${idx}`,
        label:
          (item.noPartial ?? "").trim() || item.noLabel || "-",
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
        title: entries[0]?.item.namaJenis || "—",
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

  const brokerGroups = buildSakGroups("broker", allBroker);
  const bbGroups = buildBbGroups();
  const washingGroups = buildSakGroups("washing", allWashing);
  const gilinganGroups = buildBeratGroups("gilingan", allGilingan);
  const mixerGroups = buildSakGroups("mixer", allMixer);

  const groupsByTab: Record<InputTab, InputLabelGroup[]> = {
    broker: brokerGroups,
    bb: bbGroups,
    washing: washingGroups,
    gilingan: gilinganGroups,
    mixer: mixerGroups,
  };

  const groupCountByTab: Record<InputTab, number> = {
    broker: brokerGroups.length,
    bb: bbGroups.length,
    washing: washingGroups.length,
    gilingan: gilinganGroups.length,
    mixer: mixerGroups.length,
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
      case "bb":
        return catStats(bbGroups.length, allBb, true);
      case "washing":
        return catStats(washingGroups.length, allWashing, true);
      case "gilingan":
        return catStats(gilinganGroups.length, allGilingan, false);
      default:
        return catStats(mixerGroups.length, allMixer, true);
    }
  })();

  const showActiveSak = SHOW_SAK_METRIC[selectedInputTab];

  const allDbItems = [
    ...allBroker,
    ...allBb,
    ...allWashing,
    ...allGilingan,
    ...allMixer,
  ];
  const grandBerat = allDbItems.reduce((s, i) => s + (i.berat ?? 0), 0);
  const grandSak = allBroker.length + allBb.length + allWashing.length + allMixer.length;
  const totalLabel =
    brokerGroups.length +
    bbGroups.length +
    washingGroups.length +
    gilinganGroups.length +
    mixerGroups.length;

  const outputTabCount = outputs.length;
  const outputTotalBerat = outputs.reduce((s, o) => s + o.totalBerat, 0);
  const outputTotalSak = outputs.reduce((s, o) => s + o.totalSak, 0);

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
      {/* ── Workspace toolbar ─────────────────────────────────── */}
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
          title="Status Produksi Mixer"
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: machineStatusStyle.fg }}
          />
          {machineStatusLabel}
        </span>

        <div className="flex min-w-0 flex-col">
          <span className="truncate text-lg font-extrabold leading-tight text-gray-900 sm:text-xl">
            {header?.outputJenisNama || "Proses Mixer"}
          </span>
          <span className="truncate text-[11px] text-gray-500">
            {header
              ? [
                  breadcrumbLabel,
                  tglLabel,
                  `Shift ${header.shift}`,
                  header.hourStart && header.hourEnd
                    ? `${header.hourStart}–${header.hourEnd}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "Memuat header…"}
          </span>
          {loadError && (
            <span className="truncate text-[11px] font-medium text-red-600">{loadError}</span>
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

      {/* ── Body: Input panel + Output panel ──────────────────── */}
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
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> Memuat inputs…
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
                            {g.showSakMetric ? `${g.sakCount} sak · ` : ""}
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
                    {showActiveSak ? ` · ${activeCatStats.sak} sak` : ""} ·{" "}
                    {activeCatStats.berat.toFixed(2)} kg
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-800">
                    Total: {totalLabel} label · {grandSak} sak ·{" "}
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
              {(["mixer"] as OutputTab[]).map((tab) => {
                const labels: Record<OutputTab, string> = {
                  mixer: "Output Mixer",
                };
                const counts: Record<OutputTab, number> = {
                  mixer: outputs.length,
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
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> Memuat outputs…
                  </div>
                ) : outputs.length === 0 ? (
                  <div className="flex h-24 items-center justify-center text-sm text-gray-400">
                    Belum ada output
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                    {outputs.map((o) => (
                      <button
                        key={o.NoMixer}
                        type="button"
                        onClick={() => setSelectedMixerOutput(o)}
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
                          title={o.NoMixer}
                        >
                          {o.NoMixer}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10px] text-gray-700">
                          <span>
                            {o.totalSak} sak · {o.totalBerat.toFixed(2)} kg
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
                  {outputTabCount > 0 ? (
                    <span>
                      Mixer: {outputTabCount} label · {outputTotalSak} sak ·{" "}
                      {outputTotalBerat.toFixed(2)} kg
                    </span>
                  ) : (
                    <span className="text-gray-400">Belum ada total kategori</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-800">
                    Total: {outputs.length} label · {outputTotalSak} sak ·{" "}
                    {outputTotalBerat.toFixed(2)} kg
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

      {/* ── Detail label output mixer ─────────────────────────── */}
      {selectedMixerOutput && (
        <MixerOutputDetailDialog
          output={selectedMixerOutput}
          canModify={!isLockedOrComplete}
          onClose={() => setSelectedMixerOutput(null)}
          onChanged={() => {
            void getMixerOutputsAction(noProduksi).then((res) => {
              if (res.ok) {
                setOutputs(res.outputs);
                const fresh = res.outputs.find(
                  (o) => o.NoMixer === selectedMixerOutput.NoMixer,
                );
                if (fresh) setSelectedMixerOutput(fresh);
                else setSelectedMixerOutput(null);
              }
            });
          }}
          onSnack={showSnack}
        />
      )}

      {/* ── Tambah Output Mixer ───────────────────────────────── */}
      {mixerOutputFormOpen && header?.outputJenisId != null && (
        <MixerOutputFormDialog
          noProduksi={noProduksi}
          tglProduksi={header.tglProduksi}
          idJenis={header.outputJenisId}
          namaJenis={header.outputJenisNama ?? ""}
          namaMesin={header.namaMesin}
          onClose={() => setMixerOutputFormOpen(false)}
          onSaved={(NoMixer) => {
            setMixerOutputFormOpen(false);
            showSnack(
              NoMixer
                ? `Label ${NoMixer} berhasil dibuat.`
                : "Label mixer berhasil dibuat.",
            );
            void getMixerOutputsAction(noProduksi).then((res) => {
              if (res.ok) setOutputs(res.outputs);
            });
          }}
        />
      )}

      {/* ── Edit Produksi ──────────────────────────────────────── */}
      {editOpen && header && (
        <ProductionFormDialog
          header={header}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            void handleEditSaved();
          }}
        />
      )}

      {/* ── Scan dialog ───────────────────────────────────────── */}
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
                Masukkan atau scan kode label (contoh: A.XXXXXXXXXX / D.XXXXXXXXXX)
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

      {/* ── Complete/Kunci confirm ─────────────────────────────── */}
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

      {/* ── Uncomplete confirm ────────────────────────────────── */}
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

      {/* ── Ganti Produksi dialog ─────────────────────────────── */}
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
                  {header.namaMesin} · Shift {header.shift} · {tglLabel}
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
                  Jenis Mixer
                </span>
                <select
                  value={gantiJenisId}
                  onChange={(e) =>
                    setGantiJenisId(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">— Pilih jenis —</option>
                  {gantiTypes.map((t) => (
                    <option key={t.idMixer} value={t.idMixer}>
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

      {/* ── Riwayat shift dialog ──────────────────────────────── */}
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
                  {header.namaMesin} · Shift {header.shift} · {tglLabel}
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
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> Memuat riwayat…
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
                          {item.outputJenisNama ?? "—"} ·{" "}
                          {item.hourStart && item.hourEnd
                            ? `${item.hourStart}–${item.hourEnd}`
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

      {/* ── Dialog detail label input ─────────────────────────── */}
      {selectedLabelRef &&
        (() => {
          const liveGroup = (groupsByTab[selectedLabelRef.tab] ?? []).find(
            (g) => g.key === selectedLabelRef.key,
          );
          if (!liveGroup) return null;
          return (
            <MixerInputLabelDialog
              group={liveGroup}
              canModify={!isLockedOrComplete}
              onClose={() => setSelectedLabelRef(null)}
            />
          );
        })()}

      {/* ── Clear temp confirm ────────────────────────────────── */}
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

      {/* ── Snack ─────────────────────────────────────────────── */}
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
