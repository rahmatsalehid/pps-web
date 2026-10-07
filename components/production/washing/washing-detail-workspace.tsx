"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  BbItem,
  GilinganItem,
  WashingFormulaOutput,
  WashingInputs,
  WashingItem,
  WashingOutput,
  WashingProduction,
  WashingType,
} from "@/services/washing-service";
import {
  completeWashingAction,
  deleteWashingInputsAction,
  getWashingFormulaAction,
  getWashingInputsAction,
  getWashingListAction,
  getWashingOutputsAction,
  getWashingTypesAction,
  lookupWashingLabelAction,
  splitWashingTimeAction,
  submitWashingInputsAction,
  uncompleteWashingAction,
} from "@/app/(app)/production/washing/actions";
import { ConfirmDialog } from "./confirm-dialog";
import { WashingOutputFormDialog } from "./washing-output-form-dialog";
import { WashingOutputDetailDialog } from "./washing-output-detail-dialog";
import {
  WashingInputLabelDialog,
  type InputLabelGroup,
  type InputSakChip,
} from "./washing-input-label-dialog";
import {
  CheckCircleIcon,
  FileTextIcon,
  FlaskIcon,
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

type InputTab = "bb" | "washing" | "gilingan";

/** Grouping key BB — sama dengan bbTitleKey di tablet. */
function bbTitleKey(item: BbItem): string {
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

/** Grouping key Gilingan — sama dengan gilinganTitleKey di tablet. */
function gilinganTitleKey(item: GilinganItem): string {
  const partial = (item.noGilinganPartial ?? "").trim();
  if (partial) return partial;
  return item.noGilingan ?? "-";
}

function bbPairLabel(item: BbItem): string {
  const nb = item.noBahanBaku ?? "-";
  const np = item.noPallet ?? 0;
  return np > 0 ? `${nb}-${np}` : nb;
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

function isBbPartial(item: BbItem): boolean {
  return item.isPartial === true || (item.noBBPartial ?? "").trim().length > 0;
}

function isGilinganPartial(item: GilinganItem): boolean {
  return (
    item.isPartial === true || (item.noGilinganPartial ?? "").trim().length > 0
  );
}

function bbDedupKey(item: BbItem): string {
  const base = `${item.noBahanBaku}|${item.noPallet}|${item.noSak}`;
  if (!isBbPartial(item)) return base;
  return `${base}|${item.berat ?? ""}|${(item.noBBPartial ?? "").trim()}`;
}

function gilinganDedupKey(item: GilinganItem): string {
  const base = item.noGilingan ?? "";
  if (!isGilinganPartial(item)) return base;
  return `${base}|${item.berat ?? ""}|${(item.noGilinganPartial ?? "").trim()}`;
}

export function WashingDetailWorkspace({
  noProduksi,
  initialHeader,
  canLock = false,
}: {
  noProduksi: string;
  initialHeader: WashingProduction | null;
  canLock?: boolean;
}) {
  const [header, setHeader] = useState<WashingProduction | null>(initialHeader);
  const [inputs, setInputs] = useState<WashingInputs | null>(null);
  const [outputs, setOutputs] = useState<WashingOutput[]>([]);
  const [formulaOutputs, setFormulaOutputs] = useState<WashingFormulaOutput[]>([]);
  const [allowedKodes, setAllowedKodes] = useState<Set<string> | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedInputTab, setSelectedInputTab] = useState<InputTab>("bb");

  // Dialogs
  const [showFormula, setShowFormula] = useState(false);
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

  // Ganti / Riwayat dialogs
  const [gantiOpen, setGantiOpen] = useState(false);
  const [gantiHour, setGantiHour] = useState("");
  const [gantiJenisId, setGantiJenisId] = useState<number | "">("");
  const [gantiTypes, setGantiTypes] = useState<WashingType[]>([]);
  const [gantiBusy, setGantiBusy] = useState(false);
  const [gantiError, setGantiError] = useState<string | null>(null);
  const [riwayatOpen, setRiwayatOpen] = useState(false);
  const [riwayatItems, setRiwayatItems] = useState<WashingProduction[] | null>(null);
  const [riwayatLoading, setRiwayatLoading] = useState(false);
  const [outputFormOpen, setOutputFormOpen] = useState(false);
  const [selectedOutput, setSelectedOutput] = useState<WashingOutput | null>(null);
  const [selectedLabelRef, setSelectedLabelRef] = useState<{
    tab: InputTab;
    key: string;
  } | null>(null);

  // Temp items (unsaved)
  const [tempBb, setTempBb] = useState<BbItem[]>([]);
  const [tempWashing, setTempWashing] = useState<WashingItem[]>([]);
  const [tempGilingan, setTempGilingan] = useState<GilinganItem[]>([]);
  const tempBbPartialSeq = useRef(0);
  const tempGilinganPartialSeq = useRef(0);

  function nextTempBbPartialCode(): string {
    tempBbPartialSeq.current += 1;
    return `P.XXXXXXXX (${tempBbPartialSeq.current})`;
  }

  function nextTempGilinganPartialCode(): string {
    tempGilinganPartialSeq.current += 1;
    return `Y.XXXXXXXX (${tempGilinganPartialSeq.current})`;
  }

  function withTempBbPartial(item: BbItem): BbItem {
    if (isBbPartial(item) && !(item.noBBPartial ?? "").trim()) {
      return { ...item, noBBPartial: nextTempBbPartialCode() };
    }
    return item;
  }

  function withTempGilinganPartial(item: GilinganItem): GilinganItem {
    if (isGilinganPartial(item) && !(item.noGilinganPartial ?? "").trim()) {
      return { ...item, noGilinganPartial: nextTempGilinganPartialCode() };
    }
    return item;
  }

  const router = useRouter();
  const totalTempCount = tempBb.length + tempWashing.length + tempGilingan.length;
  const isLockedOrComplete = header?.isLocked === true || header?.isComplete === true;

  const showSnack = useCallback((msg: string, color = "#16a34a") => {
    setSnack({ msg, color });
    setTimeout(() => setSnack(null), 3000);
  }, []);

  const loadData = useCallback(async () => {
    const [inp, out, frm] = await Promise.all([
      getWashingInputsAction(noProduksi),
      getWashingOutputsAction(noProduksi),
      getWashingFormulaAction(noProduksi),
    ]);
    setLoadError(inp.ok ? null : inp.error);
    setLoading(false);
    if (inp.ok) setInputs(inp.inputs);
    if (out.ok) setOutputs(out.outputs);
    if (frm.ok) {
      setFormulaOutputs(frm.outputs);
      setAllowedKodes(new Set(frm.kodes));
      const kodes = frm.kodes;
      const map: Record<string, InputTab> = {
        bahanbaku: "bb",
        bb: "bb",
        washing: "washing",
        gilingan: "gilingan",
      };
      if (kodes.length > 0) {
        const first = ["bb", "washing", "gilingan"].find((tab) =>
          kodes.some((k) => map[k] === tab),
        ) as InputTab | undefined;
        if (first) setSelectedInputTab(first);
      }
    }
  }, [noProduksi]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [inp, out, frm] = await Promise.all([
        getWashingInputsAction(noProduksi),
        getWashingOutputsAction(noProduksi),
        getWashingFormulaAction(noProduksi),
      ]);
      if (cancelled) return;
      setLoadError(inp.ok ? null : inp.error);
      setLoading(false);
      if (inp.ok) setInputs(inp.inputs);
      if (out.ok) setOutputs(out.outputs);
      if (frm.ok) {
        setFormulaOutputs(frm.outputs);
        setAllowedKodes(new Set(frm.kodes));
        const kodes = frm.kodes;
        const map: Record<string, InputTab> = {
          bahanbaku: "bb",
          bb: "bb",
          washing: "washing",
          gilingan: "gilingan",
        };
        if (kodes.length > 0) {
          const first = ["bb", "washing", "gilingan"].find((tab) =>
            kodes.some((k) => map[k] === tab),
          ) as InputTab | undefined;
          if (first) setSelectedInputTab(first);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [noProduksi]);

  const reload = useCallback(() => {
    setLoading(true);
    void loadData();
  }, [loadData]);

  function isTabAllowed(tab: InputTab): boolean {
    if (allowedKodes == null) return true;
    const map: Record<string, InputTab> = {
      bahanbaku: "bb",
      bb: "bb",
      washing: "washing",
      gilingan: "gilingan",
    };
    for (const k of allowedKodes) {
      if (map[k] === tab) return true;
    }
    return false;
  }

  function handleOpenOutputForm() {
    if (isLockedOrComplete) return;
    if (header?.outputJenisId == null) {
      showSnack(
        "Jenis output belum dikonfigurasi pada produksi ini.",
        "#f59e0b",
      );
      return;
    }
    setOutputFormOpen(true);
  }

  // ── Status mesin + toolbar helpers ─────────────────────────────────────────

  function isWithinTimeRange(h: WashingProduction | null): boolean {
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
      const res = await getWashingTypesAction();
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
      setGantiError("Jenis washing wajib dipilih");
      return;
    }
    setGantiBusy(true);
    setGantiError(null);
    const res = await splitWashingTimeAction({
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
        router.push(`/production/washing/${encodeURIComponent(res.noProduksi)}`);
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
    const res = await getWashingListAction({
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

  function openReportPdf() {
    window.open(
      `/production/washing/${encodeURIComponent(noProduksi)}/laporan/pdf`,
      "_blank",
      "noopener",
    );
  }

  async function handleComplete() {
    setActionBusy(true);
    setActionError(null);
    const res = await completeWashingAction(noProduksi);
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
    const res = await uncompleteWashingAction(noProduksi);
    setActionBusy(false);
    if (res.status === "success") {
      setConfirmUncomplete(false);
      showSnack("Kunci produksi dibuka — bisa diubah lagi");
      setHeader((h) => (h ? { ...h, isComplete: false, produksiStatus: "pending" } : h));
    } else {
      setActionError(res.message ?? "Gagal");
    }
  }

  async function handleSave() {
    if (totalTempCount === 0) {
      showSnack("Tidak ada data untuk disimpan", "#f59e0b");
      return;
    }
    const payload: Record<string, unknown> = {};
    if (tempBb.length) {
      const incomplete = tempBb.find(
        (e) => e.noBahanBaku == null || e.noPallet == null || e.noSak == null,
      );
      if (incomplete) {
        showSnack(
          `Label bahan baku ${incomplete.noBahanBaku ?? "?"} belum lengkap (NoPallet/NoSak). Scan ulang.`,
          "#dc2626",
        );
        return;
      }
      const bbFull = tempBb.filter((e) => !isBbPartial(e));
      const bbPartial = tempBb.filter((e) => isBbPartial(e));
      if (bbFull.length) {
        payload.bb = bbFull.map((e) => ({
          noBahanBaku: e.noBahanBaku,
          noPallet: e.noPallet,
          noSak: e.noSak,
        }));
      }
      if (bbPartial.length) {
        payload.bbPartial = bbPartial.map((e) => ({
          noBahanBaku: e.noBahanBaku,
          noPallet: e.noPallet,
          noSak: e.noSak,
          berat: e.berat,
        }));
      }
    }
    if (tempWashing.length) {
      const incomplete = tempWashing.find(
        (e) => e.noWashing == null || e.noSak == null,
      );
      if (incomplete) {
        showSnack(
          `Label washing ${incomplete.noWashing ?? "?"} belum lengkap (NoSak kosong). Scan ulang.`,
          "#dc2626",
        );
        return;
      }
      payload.washing = tempWashing.map((e) => ({
        noWashing: e.noWashing,
        noSak: e.noSak,
      }));
    }
    if (tempGilingan.length) {
      const incomplete = tempGilingan.find((e) => e.noGilingan == null);
      if (incomplete) {
        showSnack(
          `Label gilingan ${incomplete.noGilingan ?? "?"} tidak valid. Scan ulang.`,
          "#dc2626",
        );
        return;
      }
      const gilFull = tempGilingan.filter((e) => !isGilinganPartial(e));
      const gilPartial = tempGilingan.filter((e) => isGilinganPartial(e));
      if (gilFull.length) {
        payload.gilingan = gilFull.map((e) => ({ noGilingan: e.noGilingan }));
      }
      if (gilPartial.length) {
        payload.gilinganPartial = gilPartial.map((e) => ({
          noGilingan: e.noGilingan,
          berat: e.berat,
        }));
      }
    }

    const res = await submitWashingInputsAction(
      noProduksi,
      payload as Parameters<typeof submitWashingInputsAction>[1],
    );
    if (res.status === "success") {
      setTempBb([]);
      setTempWashing([]);
      setTempGilingan([]);
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
    setTempBb([]);
    setTempWashing([]);
    setTempGilingan([]);
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

    // prefix formula validation
    const prefix = code.length >= 2 ? code.substring(0, 2).toUpperCase() : "";
    if (formulaOutputs.length > 0) {
      const prefixAllowed = formulaOutputs.some((o) =>
        o.formulas.some((f) => f.prefixLabel.toUpperCase() === prefix),
      );
      if (!prefixAllowed) {
        const allowed = new Set(
          formulaOutputs.flatMap((o) => o.formulas.map((f) => f.prefixLabel)),
        );
        setScanError(
          `Label tidak sesuai formula. Prefix yang diizinkan: ${Array.from(allowed).join(", ")}`,
        );
        setScanLoading(false);
        return;
      }
    }

    if (prefix !== "A." && prefix !== "B." && prefix !== "V.") {
      setScanError(`Prefix label "${prefix}" belum didukung.`);
      setScanLoading(false);
      return;
    }

    // Lookup ke backend agar dapat key lengkap (NoBahanBaku+NoPallet+NoSak, dll).
    // Tanpa key lengkap backend membalas "Beberapa data tidak valid".
    const lookup = await lookupWashingLabelAction(code);
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
      setScanError(`Label ${code} tidak memiliki data sak tersedia.`);
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

    if (prefix === "A.") {
      const existing = new Set<string>();
      for (const b of [...tempBb, ...(inputs?.bb ?? [])]) existing.add(bbDedupKey(b));
      const next: BbItem[] = [];
      for (const row of rows) {
        let item: BbItem = {
          noBahanBaku: asStr(row.noBahanBaku),
          noPallet: asNum(row.noPallet),
          noSak: asNum(row.noSak),
          noBBPartial: asStr(row.noBBPartial),
          berat: asNum(row.berat),
          beratAct: asNum(row.beratAct),
          isPartial: asBool(row.isPartial),
          dateUsage: asStr(row.dateUsage),
          idJenis: asNum(row.idJenis),
          namaJenis: asStr(row.namaJenis),
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
      setTempBb((prev) => [...prev, ...next]);
      showSnack(`${next.length} sak bahan baku ditambahkan ke temp`);
      setScanOpen(false);
      setScanCode("");
    } else if (prefix === "B.") {
      const existing = new Set(
        tempWashing.map((w) => `${w.noWashing}|${w.noSak}`),
      );
      const next: WashingItem[] = [];
      for (const row of rows) {
        const item: WashingItem = {
          noWashing: asStr(row.noWashing),
          noSak: asNum(row.noSak),
          berat: asNum(row.berat),
          beratAct: asNum(row.beratAct),
          isPartial: asBool(row.isPartial),
          idJenis: asNum(row.idJenis),
          namaJenis: asStr(row.namaJenis),
        };
        if (item.noWashing == null || item.noSak == null) {
          setScanError("Data label washing tidak lengkap (NoSak kosong).");
          setScanLoading(false);
          return;
        }
        const key = `${item.noWashing}|${item.noSak}`;
        if (existing.has(key)) continue;
        existing.add(key);
        next.push(item);
      }
      if (next.length === 0) {
        setScanError("Semua sak pada label sudah ada di temp.");
        setScanLoading(false);
        return;
      }
      setTempWashing((prev) => [...prev, ...next]);
      showSnack(`${next.length} sak washing ditambahkan ke temp`);
      setScanOpen(false);
      setScanCode("");
    } else {
      const existing = new Set<string>();
      for (const g of [...tempGilingan, ...(inputs?.gilingan ?? [])]) {
        existing.add(gilinganDedupKey(g));
      }
      const next: GilinganItem[] = [];
      for (const row of rows) {
        let item: GilinganItem = {
          noGilingan: asStr(row.noGilingan),
          noGilinganPartial: asStr(row.noGilinganPartial),
          berat: asNum(row.berat),
          beratAct: asNum(row.beratAct),
          isPartial: asBool(row.isPartial),
          idJenis: asNum(row.idJenis),
          namaJenis: asStr(row.namaJenis),
          dateCreate: asStr(row.dateCreate),
          dateUsage: asStr(row.dateUsage),
        };
        if (item.noGilingan == null) {
          setScanError("Data label gilingan tidak lengkap.");
          setScanLoading(false);
          return;
        }
        item = withTempGilinganPartial(item);
        const key = gilinganDedupKey(item);
        if (existing.has(key)) continue;
        existing.add(key);
        next.push(item);
      }
      if (next.length === 0) {
        setScanError("Label gilingan sudah ada di temp.");
        setScanLoading(false);
        return;
      }
      setTempGilingan((prev) => [...prev, ...next]);
      showSnack(`${next.length} gilingan ditambahkan ke temp`);
      setScanOpen(false);
      setScanCode("");
    }
    setScanLoading(false);
  }

  // ── Delete input item ──────────────────────────────────────────────────────

  async function deleteInputItem(kind: "bb" | "washing" | "gilingan", item: unknown) {
    const payload: Record<string, unknown[]> = {};
    if (kind === "bb") {
      const b = item as BbItem;
      if (isBbPartial(b)) {
        const code = (b.noBBPartial ?? "").trim();
        if (code) payload.bbPartial = [{ noBBPartial: code }];
      } else {
        payload.bb = [{ noBahanBaku: b.noBahanBaku, noPallet: b.noPallet, noSak: b.noSak }];
      }
    } else if (kind === "washing") {
      const w = item as WashingItem;
      payload.washing = [{ noWashing: w.noWashing, noSak: w.noSak }];
    } else if (kind === "gilingan") {
      const g = item as GilinganItem;
      if (isGilinganPartial(g)) {
        const code = (g.noGilinganPartial ?? "").trim();
        if (code) payload.gilinganPartial = [{ noGilinganPartial: code }];
        else payload.gilinganPartial = [{ noGilingan: g.noGilingan, berat: g.berat }];
      } else payload.gilingan = [{ noGilingan: g.noGilingan }];
    }
    const res = await deleteWashingInputsAction(
      noProduksi,
      payload as Parameters<typeof deleteWashingInputsAction>[1],
    );
    if (res.status === "success") {
      showSnack("Label berhasil dikeluarkan");
      reload();
    } else {
      showSnack(res.message ?? "Gagal menghapus", "#dc2626");
    }
  }

  // ── Derived totals + grouping per label (seperti tablet) ──────────────────

  const allBb = inputs?.bb ?? [];
  const allWashing = inputs?.washing ?? [];
  const allGilingan = inputs?.gilingan ?? [];

  // Gabung temp + DB (temp dulu — urutan sama seperti tablet)
  const bbAll: BbItem[] = [...tempBb, ...allBb];
  const washingAll: WashingItem[] = [...tempWashing, ...allWashing];
  const gilinganAll: GilinganItem[] = [...tempGilingan, ...allGilingan];

  type Marked<T> = { item: T; isTemp: boolean };

  function markedBb(): Marked<BbItem>[] {
    return [
      ...tempBb.map((item) => ({ item, isTemp: true })),
      ...allBb.map((item) => ({ item, isTemp: false })),
    ];
  }
  function markedWashing(): Marked<WashingItem>[] {
    return [
      ...tempWashing.map((item) => ({ item, isTemp: true })),
      ...allWashing.map((item) => ({ item, isTemp: false })),
    ];
  }
  function markedGilingan(): Marked<GilinganItem>[] {
    return [
      ...tempGilingan.map((item) => ({ item, isTemp: true })),
      ...allGilingan.map((item) => ({ item, isTemp: false })),
    ];
  }

  function removeTempItem(tab: InputTab, item: unknown) {
    if (tab === "bb") setTempBb((p) => p.filter((x) => x !== item));
    else if (tab === "washing") setTempWashing((p) => p.filter((x) => x !== item));
    else setTempGilingan((p) => p.filter((x) => x !== item));
  }

  function buildBbGroups(): InputLabelGroup[] {
    const groups = groupBy(markedBb(), ({ item }) => bbTitleKey(item));
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

  function buildWashingGroups(): InputLabelGroup[] {
    const groups = groupBy(markedWashing(), ({ item }) => item.noWashing ?? "-");
    return Array.from(groups.entries()).map(([key, entries]) => {
      const chips: InputSakChip[] = entries.map(({ item, isTemp }, idx) => ({
        id: `${key}-w-${idx}`,
        label: `Sak ${item.noSak ?? "-"}`,
        berat: item.berat,
        isTemp,
        isPartial: item.isPartial === true,
        onDelete:
          isTemp && !isLockedOrComplete
            ? () => removeTempItem("washing", item)
            : !isTemp && !isLockedOrComplete
              ? () => void deleteInputItem("washing", item)
              : undefined,
      }));
      return {
        key,
        title: entries[0]?.item.namaJenis || "—",
        subtitle: key,
        sakCount: entries.length,
        berat: entries.reduce((s, { item }) => s + (item.berat ?? 0), 0),
        hasPartial: entries.some(({ item }) => item.isPartial === true),
        isTemp: entries.some(({ isTemp }) => isTemp),
        chips,
        showSakMetric: true,
      };
    });
  }

  function buildGilinganGroups(): InputLabelGroup[] {
    const groups = groupBy(markedGilingan(), ({ item }) => gilinganTitleKey(item));
    return Array.from(groups.entries()).map(([key, entries]) => {
      const first = entries[0]?.item;
      const noGilingan = (first?.noGilingan ?? "").trim();
      const chips: InputSakChip[] = entries.map(({ item, isTemp }, idx) => ({
        id: `${key}-g-${idx}`,
        label:
          (item.noGilinganPartial ?? "").trim() ||
          item.noGilingan ||
          "-",
        berat: item.berat,
        isTemp,
        isPartial: isGilinganPartial(item),
        onDelete:
          isTemp && !isLockedOrComplete
            ? () => removeTempItem("gilingan", item)
            : !isTemp && !isLockedOrComplete
              ? () => void deleteInputItem("gilingan", item)
              : undefined,
      }));
      return {
        key,
        title: entries[0]?.item.namaJenis || "—",
        subtitle: noGilingan || key,
        sakCount: entries.length,
        berat: entries.reduce((s, { item }) => s + (item.berat ?? 0), 0),
        hasPartial: entries.some(({ item }) => isGilinganPartial(item)),
        isTemp: entries.some(({ isTemp }) => isTemp),
        chips,
        showSakMetric: false,
      };
    });
  }

  const bbGroups = buildBbGroups();
  const washingGroups = buildWashingGroups();
  const gilinganGroups = buildGilinganGroups();
  const groupCountByTab: Record<InputTab, number> = {
    bb: bbGroups.length,
    washing: washingGroups.length,
    gilingan: gilinganGroups.length,
  };

  const activeGroups: InputLabelGroup[] = (() => {
    switch (selectedInputTab) {
      case "washing":
        return washingGroups;
      case "gilingan":
        return gilinganGroups;
      default:
        return bbGroups;
    }
  })();

  const catStats = (
    labels: number,
    items: readonly { berat?: number | null; noSak?: number | null }[],
    /** Gilingan di tablet: kategori sak = 0 (item tetap dihitung di grand) */
    countSakAsItems = true,
  ) => ({
    labels,
    sak: countSakAsItems ? items.length : 0,
    berat: items.reduce((s, i) => s + (i.berat ?? 0), 0),
  });

  const bbStats = catStats(bbGroups.length, bbAll);
  const washingStats = catStats(washingGroups.length, washingAll);
  const gilinganStats = catStats(gilinganGroups.length, gilinganAll, false);

  const grandSak = bbAll.length + washingAll.length + gilinganAll.length;
  const grandBerat =
    bbAll.reduce((s, i) => s + (i.berat ?? 0), 0) +
    washingAll.reduce((s, i) => s + (i.berat ?? 0), 0) +
    gilinganAll.reduce((s, i) => s + (i.berat ?? 0), 0);
  const totalLabel = bbGroups.length + washingGroups.length + gilinganGroups.length;

  const activeCatLabel: Record<InputTab, string> = {
    bb: "BB",
    washing: "Washing",
    gilingan: "Gilingan",
  };
  const activeCatStats =
    selectedInputTab === "bb"
      ? bbStats
      : selectedInputTab === "washing"
        ? washingStats
        : gilinganStats;

  // Output selalu 1 kategori tab: "Washing" (bukan namaJenis produk).
  const outputTabCount = outputs.length;
  const outputTotalSak = outputs.reduce((s, o) => s + o.detailSak.length, 0);
  const outputTotalBerat = outputs.reduce(
    (s, o) => s + o.detailSak.reduce((ss, d) => ss + d.berat, 0),
    0,
  );
  const visibleOutputs = outputs;

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
        style={{ borderColor: "#E2E6EA", backgroundColor: "#F8F9FB" }}
      >
        {/* Status mesin (pengganti Kembali) */}
        <span
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
          style={{
            backgroundColor: machineStatusStyle.bg,
            color: machineStatusStyle.fg,
            borderColor: machineStatusStyle.border,
          }}
          title="Status mesin"
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: machineStatusStyle.fg }}
          />
          {machineStatusLabel}
        </span>

        <div className="flex min-w-0 flex-col">
          {/* Jenis — bold besar di atas */}
          <span className="truncate text-lg font-extrabold leading-tight text-gray-900 sm:text-xl">
            {header?.outputJenisNama || "—"}
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

      {/* ── Body: Input panel + Output panel ──────────────────── */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-hidden p-2 lg:grid-cols-2 lg:gap-3 lg:p-3">
        {/* INPUT PANEL */}
        <div
          className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-white"
          style={{ borderColor: "#E2E6EA" }}
        >
          {/* Panel header */}
          <div className="flex min-h-11 items-center gap-2 border-b px-3 py-2" style={{ borderColor: "#E2E6EA" }}>
            <span
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold"
              style={{ backgroundColor: `${PRIMARY}14`, color: PRIMARY }}
            >
              Input
            </span>
            <div className="ml-auto flex items-center gap-1">
              {formulaOutputs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowFormula(true)}
                  className="rounded p-1.5 hover:bg-gray-100"
                  title="Lihat Formula Input"
                  style={{ color: PRIMARY }}
                >
                  <FlaskIcon className="h-4 w-4" />
                </button>
              )}

              {/* Save badge */}
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

              {/* Clear temp */}
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

          {/* Folder tabs — border atas, menyatu ke konten (seperti Flutter) */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 pb-0">
            <div
              className="flex gap-1 rounded-t-xl border px-1.5 pt-1.5"
              style={{ borderColor: `${PRIMARY}52`, backgroundColor: "#ECEFF3" }}
            >
              {(["bb", "washing", "gilingan"] as InputTab[])
                .filter((t) => isTabAllowed(t))
                .map((tab) => {
                  const labels: Record<InputTab, string> = {
                    bb: "Bahan Baku",
                    washing: "Washing",
                    gilingan: "Gilingan",
                  };
                  const counts: Record<InputTab, number> = {
                    bb: groupCountByTab.bb,
                    washing: groupCountByTab.washing,
                    gilingan: groupCountByTab.gilingan,
                  };
                  const active = selectedInputTab === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setSelectedInputTab(tab)}
                      className={`relative rounded-t-lg border px-2.5 text-[11px] font-extrabold transition ${
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
                      {labels[tab]}
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

            {/* Content block — border bawah, rounded-b (seperti Flutter) */}
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
                {/* Group tile per label — klik → dialog detail (seperti tablet) */}
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
                      borderColor: g.isTemp ? "#FDE68A" : "#E2E6EA",
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

              {/* Footer: total per kategori + total + Scan */}
              <div
                className="shrink-0 space-y-1 border-t px-3 py-2"
                style={{ borderColor: "#E2E6EA", backgroundColor: "#F8F9FB" }}
              >
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-600">
                  {isTabAllowed(selectedInputTab) && (
                    <span>
                      {activeCatLabel[selectedInputTab]}: {activeCatStats.labels}{" "}
                      label · {activeCatStats.sak} sak ·{" "}
                      {activeCatStats.berat.toFixed(2)} kg
                    </span>
                  )}
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
          style={{ borderColor: "#E2E6EA" }}
        >
          <div className="flex min-h-11 items-center gap-2 border-b px-3 py-2" style={{ borderColor: "#E2E6EA" }}>
            <span
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold"
              style={{ backgroundColor: `${OUTPUT_TEAL}14`, color: OUTPUT_TEAL }}
            >
              Output
            </span>
          </div>

          {/* Folder tabs + content — border atas/bawah seperti Flutter */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 pb-0">
            <div
              className="flex gap-1 rounded-t-xl border px-1.5 pt-1.5"
              style={{ borderColor: `${OUTPUT_TEAL}52`, backgroundColor: "#ECEFF3" }}
            >
              <button
                type="button"
                className="relative z-10 -mb-px rounded-t-lg border bg-white px-2.5 py-1.5 text-[11px] font-extrabold"
                style={{
                  borderColor: `${OUTPUT_TEAL}52`,
                  color: OUTPUT_TEAL,
                  boxShadow: "inset 0 -2px 0 #fff",
                }}
              >
                Washing
                <span
                  className="ml-1 rounded-full px-1.5 text-[9px] font-extrabold"
                  style={{
                    backgroundColor: `${OUTPUT_TEAL}1A`,
                    color: OUTPUT_TEAL,
                  }}
                >
                  {outputTabCount}
                </span>
              </button>
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
            ) : visibleOutputs.length === 0 ? (
              <div className="flex h-24 items-center justify-center text-sm text-gray-400">
                Belum ada output
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                {visibleOutputs.map((o) => {
                  const totalSak = o.detailSak.length;
                  const totalBerat = o.detailSak.reduce((s, d) => s + d.berat, 0);
                  return (
                    <button
                      key={o.noWashing}
                      type="button"
                      onClick={() => setSelectedOutput(o)}
                      className="rounded-lg border p-2 text-left transition hover:shadow-sm"
                      style={{
                        borderColor: "#E2E6EA",
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
                      <p className="truncate text-[10px] leading-snug text-gray-600" title={o.noWashing}>
                        {o.noWashing}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10px] text-gray-700">
                        <span>
                          {totalSak} sak · {totalBerat.toFixed(2)} kg
                        </span>
                        {o.hasPrinted > 0 && (
                          <span className="rounded bg-green-50 px-1 text-[9px] text-green-700">
                            Printed
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
              </div>

              {/* Footer: total kategori + total + Tambah Output */}
              <div
                className="shrink-0 space-y-1 border-t px-3 py-2"
                style={{ borderColor: "#E2E6EA", backgroundColor: "#F8F9FB" }}
              >
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-600">
                  {outputs.length > 0 ? (
                    <span>
                      Washing: {outputs.length} label · {outputTotalSak} sak ·{" "}
                      {outputTotalBerat.toFixed(2)} kg
                    </span>
                  ) : (
                    <span className="text-gray-400">Belum ada total kategori</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-800">
                    Total: {visibleOutputs.length} label · {outputTotalSak} sak ·{" "}
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

      {/* ── Detail label output ───────────────────────────────── */}
      {selectedOutput && (
        <WashingOutputDetailDialog
          output={selectedOutput}
          canModify={!isLockedOrComplete}
          onClose={() => setSelectedOutput(null)}
          onChanged={() => {
            void getWashingOutputsAction(noProduksi).then((res) => {
              if (res.ok) {
                setOutputs(res.outputs);
                const fresh = res.outputs.find(
                  (o) => o.noWashing === selectedOutput.noWashing,
                );
                if (fresh) setSelectedOutput(fresh);
                else setSelectedOutput(null);
              }
            });
          }}
          onSnack={showSnack}
        />
      )}

      {/* ── Tambah Output dialog ──────────────────────────────── */}
      {outputFormOpen && header?.outputJenisId != null && (
        <WashingOutputFormDialog
          noProduksi={noProduksi}
          tglProduksi={header.tglProduksi}
          idJenis={header.outputJenisId}
          namaJenis={header.outputJenisNama ?? ""}
          namaMesin={header.namaMesin}
          onClose={() => setOutputFormOpen(false)}
          onSaved={(noWashing) => {
            setOutputFormOpen(false);
            showSnack(
              noWashing
                ? `Label ${noWashing} berhasil dibuat.`
                : "Label washing berhasil dibuat.",
            );
            void getWashingOutputsAction(noProduksi).then((res) => {
              if (res.ok) setOutputs(res.outputs);
            });
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
                Masukkan atau scan kode label (contoh: A.XXXXXXXXXX)
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

      {/* ── Formula dialog ────────────────────────────────────── */}
      {showFormula && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div
              className="flex items-center justify-between px-5 py-3 text-white"
              style={{ backgroundColor: PRIMARY }}
            >
              <div className="flex items-center gap-2">
                <FlaskIcon className="h-4 w-4" />
                <span className="text-sm font-bold">Formula Input</span>
              </div>
              <button type="button" onClick={() => setShowFormula(false)} className="rounded p-1 hover:bg-white/15">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {formulaOutputs.map((o, oi) => {
                const grouped: Record<string, typeof o.formulas> = {};
                for (const f of o.formulas) {
                  (grouped[f.kategoriNama] ??= []).push(f);
                }
                return (
                  <div key={oi}>
                    <div
                      className="rounded-md px-2.5 py-1.5 text-xs font-semibold"
                      style={{ backgroundColor: `${PRIMARY}14`, color: PRIMARY }}
                    >
                      {o.namaJenis}
                    </div>
                    <div className="mt-1.5 space-y-1.5">
                      {Object.entries(grouped).map(([kat, formulas]) => (
                        <div key={kat}>
                          <div className="flex items-center gap-1.5">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                              {kat}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {formulas[0]?.prefixLabel}
                            </span>
                          </div>
                          <ul className="mt-0.5 space-y-0.5">
                            {formulas.map((f, fi) => (
                              <li key={fi} className="flex items-center gap-1 pl-2 text-xs text-gray-700">
                                <span className="text-gray-400">›</span> {f.inputNama}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
                <span className="mb-1 block text-xs font-medium text-gray-600">Jam Mulai</span>
                <input
                  type="time"
                  value={gantiHour}
                  onChange={(e) => setGantiHour(e.target.value)}
                  className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-600">Jenis Washing</span>
                <select
                  value={gantiJenisId}
                  onChange={(e) =>
                    setGantiJenisId(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">— Pilih jenis —</option>
                  {gantiTypes.map((t) => (
                    <option key={t.idWashing} value={t.idWashing}>
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

      {/* ── Dialog detail label input ─────────────────────────────── */}
      {selectedLabelRef &&
        (() => {
          const groups: InputLabelGroup[] =
            selectedLabelRef.tab === "washing"
              ? washingGroups
              : selectedLabelRef.tab === "gilingan"
                ? gilinganGroups
                : bbGroups;
          const liveGroup = groups.find(
            (g) => g.key === selectedLabelRef.key,
          );
          if (!liveGroup) return null;
          return (
            <WashingInputLabelDialog
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
