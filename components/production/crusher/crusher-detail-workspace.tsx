"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CrusherBbItem,
  CrusherBonggolanItem,
  CrusherFormulaOutput,
  CrusherInputs,
  CrusherOutput,
  CrusherProduction,
  CrusherType,
} from "@/services/crusher-service";
import {
  completeCrusherAction,
  deleteCrusherInputsAction,
  getCrusherFormulaAction,
  getCrusherInputsAction,
  getCrusherListAction,
  getCrusherOutputsAction,
  getCrusherTypesAction,
  lookupCrusherLabelAction,
  splitCrusherTimeAction,
  submitCrusherInputsAction,
  uncompleteCrusherAction,
} from "@/app/(app)/production/crusher/actions";
import { ConfirmDialog } from "./confirm-dialog";
import { CrusherOutputFormDialog } from "./crusher-output-form-dialog";
import { CrusherOutputDetailDialog } from "./crusher-output-detail-dialog";
import {
  CrusherInputLabelDialog,
  type InputLabelGroup,
  type InputSakChip,
} from "./crusher-input-label-dialog";
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

type InputTab = "bb" | "bonggolan";

/** Grouping key BB — sama dengan bbTitleKey di tablet. */
function bbTitleKey(item: CrusherBbItem): string {
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

/** Grouping key Bonggolan — sama dengan bonggolanTitleKey di tablet. */
function bonggolanTitleKey(item: CrusherBonggolanItem): string {
  return item.noBonggolan ?? "-";
}

function bbPairLabel(item: CrusherBbItem): string {
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

export function CrusherDetailWorkspace({
  noProduksi,
  initialHeader,
  canLock = false,
}: {
  noProduksi: string;
  initialHeader: CrusherProduction | null;
  canLock?: boolean;
}) {
  const [header, setHeader] = useState<CrusherProduction | null>(initialHeader);
  const [inputs, setInputs] = useState<CrusherInputs | null>(null);
  const [outputs, setOutputs] = useState<CrusherOutput[]>([]);
  const [formulaOutputs, setFormulaOutputs] = useState<CrusherFormulaOutput[]>([]);
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
  const [gantiTypes, setGantiTypes] = useState<CrusherType[]>([]);
  const [gantiBusy, setGantiBusy] = useState(false);
  const [gantiError, setGantiError] = useState<string | null>(null);
  const [riwayatOpen, setRiwayatOpen] = useState(false);
  const [riwayatItems, setRiwayatItems] = useState<CrusherProduction[] | null>(null);
  const [riwayatLoading, setRiwayatLoading] = useState(false);
  const [outputFormOpen, setOutputFormOpen] = useState(false);
  const [selectedOutput, setSelectedOutput] = useState<CrusherOutput | null>(null);
  const [selectedLabelRef, setSelectedLabelRef] = useState<{
    tab: InputTab;
    key: string;
  } | null>(null);

  // Temp items (unsaved)
  const [tempBb, setTempBb] = useState<CrusherBbItem[]>([]);
  const [tempBonggolan, setTempBonggolan] = useState<CrusherBonggolanItem[]>([]);

  const router = useRouter();
  const totalTempCount = tempBb.length + tempBonggolan.length;
  const isLockedOrComplete = header?.isLocked === true || header?.isComplete === true;

  const showSnack = useCallback((msg: string, color = "#16a34a") => {
    setSnack({ msg, color });
    setTimeout(() => setSnack(null), 3000);
  }, []);

  const loadData = useCallback(async () => {
    const [inp, out, frm] = await Promise.all([
      getCrusherInputsAction(noProduksi),
      getCrusherOutputsAction(noProduksi),
      getCrusherFormulaAction(noProduksi),
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
        bonggolan: "bonggolan",
      };
      if (kodes.length > 0) {
        const first = ["bb", "bonggolan"].find((tab) =>
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
        getCrusherInputsAction(noProduksi),
        getCrusherOutputsAction(noProduksi),
        getCrusherFormulaAction(noProduksi),
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
          bonggolan: "bonggolan",
        };
        if (kodes.length > 0) {
          const first = ["bb", "bonggolan"].find((tab) =>
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
      bonggolan: "bonggolan",
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

  function isWithinTimeRange(h: CrusherProduction | null): boolean {
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
      const res = await getCrusherTypesAction();
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
      setGantiError("Jenis crusher wajib dipilih");
      return;
    }
    setGantiBusy(true);
    setGantiError(null);
    const res = await splitCrusherTimeAction({
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
        router.push(`/production/crusher/${encodeURIComponent(res.noProduksi)}`);
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
    const res = await getCrusherListAction({
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
      `/production/crusher/${encodeURIComponent(noProduksi)}/laporan/pdf`,
      "_blank",
      "noopener",
    );
  }

  // ── Toolbar actions ────────────────────────────────────────────────────────

  async function handleComplete() {
    setActionBusy(true);
    setActionError(null);
    const res = await completeCrusherAction(noProduksi);
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
    const res = await uncompleteCrusherAction(noProduksi);
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
      payload.bb = tempBb.map((e) => ({
        noBahanBaku: e.noBahanBaku,
        noPallet: e.noPallet,
        noSak: e.noSak,
      }));
    }
    if (tempBonggolan.length) {
      const incomplete = tempBonggolan.find((e) => e.noBonggolan == null);
      if (incomplete) {
        showSnack(
          "Label bonggolan tidak valid. Scan ulang.",
          "#dc2626",
        );
        return;
      }
      payload.bonggolan = tempBonggolan.map((e) => ({ noBonggolan: e.noBonggolan }));
    }

    const res = await submitCrusherInputsAction(
      noProduksi,
      payload as Parameters<typeof submitCrusherInputsAction>[1],
    );
    if (res.status === "success") {
      setTempBb([]);
      setTempBonggolan([]);
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
    setTempBonggolan([]);
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

    if (prefix !== "A." && prefix !== "M.") {
      setScanError(`Prefix label "${prefix}" belum didukung.`);
      setScanLoading(false);
      return;
    }

    // Lookup ke backend agar dapat key lengkap (NoBahanBaku+NoPallet+NoSak, dll).
    // Tanpa key lengkap backend membalas "Beberapa data tidak valid".
    const lookup = await lookupCrusherLabelAction(code);
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

    if (prefix === "A.") {
      const existing = new Set(
        tempBb.map((b) => `${b.noBahanBaku}|${b.noPallet}|${b.noSak}`),
      );
      const next: CrusherBbItem[] = [];
      for (const row of rows) {
        const item: CrusherBbItem = {
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
        const key = `${item.noBahanBaku}|${item.noPallet}|${item.noSak}`;
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
    } else {
      const existing = new Set(tempBonggolan.map((g) => g.noBonggolan));
      const next: CrusherBonggolanItem[] = [];
      for (const row of rows) {
        const item: CrusherBonggolanItem = {
          noBonggolan: asStr(row.noBonggolan ?? row.NoBonggolan),
          berat: asNum(row.berat ?? row.Berat),
          beratAct: asNum(row.beratAct ?? row.BeratAct),
          idJenis: asNum(row.idJenis ?? row.IdJenis),
          namaJenis: asStr(row.namaJenis ?? row.NamaJenis),
          dateUsage: asStr(row.dateUsage ?? row.DateUsage),
        };
        if (item.noBonggolan == null) {
          setScanError("Data label bonggolan tidak lengkap.");
          setScanLoading(false);
          return;
        }
        if (existing.has(item.noBonggolan)) continue;
        existing.add(item.noBonggolan);
        next.push(item);
      }
      if (next.length === 0) {
        setScanError("Label bonggolan sudah ada di temp.");
        setScanLoading(false);
        return;
      }
      setTempBonggolan((prev) => [...prev, ...next]);
      showSnack(`${next.length} bonggolan ditambahkan ke temp`);
      setScanOpen(false);
      setScanCode("");
    }
    setScanLoading(false);
  }

  // ── Delete input item ──────────────────────────────────────────────────────

  async function deleteInputItem(kind: "bb" | "bonggolan", item: unknown) {
    const payload: Record<string, unknown[]> = {};
    if (kind === "bb") {
      const b = item as CrusherBbItem;
      const partial = (b.noBBPartial ?? "").trim();
      if (partial) payload.bbPartial = [{ noBBPartial: partial }];
      else
        payload.bb = [{ noBahanBaku: b.noBahanBaku, noPallet: b.noPallet, noSak: b.noSak }];
    } else {
      const g = item as CrusherBonggolanItem;
      payload.bonggolan = [{ noBonggolan: g.noBonggolan }];
    }
    const res = await deleteCrusherInputsAction(
      noProduksi,
      payload as Parameters<typeof deleteCrusherInputsAction>[1],
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
  const allBonggolan = inputs?.bonggolan ?? [];

  // Gabung temp + DB (temp dulu — urutan sama seperti tablet)
  const bbAll: CrusherBbItem[] = [...tempBb, ...allBb];
  const bonggolanAll: CrusherBonggolanItem[] = [...tempBonggolan, ...allBonggolan];

  type Marked<T> = { item: T; isTemp: boolean };

  function markedBb(): Marked<CrusherBbItem>[] {
    return [
      ...tempBb.map((item) => ({ item, isTemp: true })),
      ...allBb.map((item) => ({ item, isTemp: false })),
    ];
  }
  function markedBonggolan(): Marked<CrusherBonggolanItem>[] {
    return [
      ...tempBonggolan.map((item) => ({ item, isTemp: true })),
      ...allBonggolan.map((item) => ({ item, isTemp: false })),
    ];
  }

  function removeTempItem(tab: InputTab, item: unknown) {
    if (tab === "bb") setTempBb((p) => p.filter((x) => x !== item));
    else setTempBonggolan((p) => p.filter((x) => x !== item));
  }

  function buildBbGroups(): InputLabelGroup[] {
    const groups = groupBy(markedBb(), ({ item }) => bbTitleKey(item));
    return Array.from(groups.entries()).map(([key, entries]) => {
      const hasPartial = entries.some(
        ({ item }) => (item.noBBPartial ?? "").trim().length > 0,
      );
      const firstPartial = entries.find(
        ({ item }) => (item.noBBPartial ?? "").trim().length > 0,
      );
      const chips: InputSakChip[] = entries.map(({ item, isTemp }, idx) => ({
        id: `${key}-bb-${idx}`,
        label: `Sak ${item.noSak ?? "-"}`,
        berat: item.berat,
        isTemp,
        isPartial: (item.noBBPartial ?? "").trim().length > 0,
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

  function buildBonggolanGroups(): InputLabelGroup[] {
    const groups = groupBy(markedBonggolan(), ({ item }) => bonggolanTitleKey(item));
    return Array.from(groups.entries()).map(([key, entries]) => {
      const chips: InputSakChip[] = entries.map(({ item, isTemp }, idx) => ({
        id: `${key}-bo-${idx}`,
        label: item.noBonggolan || "-",
        berat: item.berat,
        isTemp,
        isPartial: false,
        onDelete:
          isTemp && !isLockedOrComplete
            ? () => removeTempItem("bonggolan", item)
            : !isTemp && !isLockedOrComplete
              ? () => void deleteInputItem("bonggolan", item)
              : undefined,
      }));
      return {
        key,
        title: entries[0]?.item.namaJenis || "—",
        subtitle: key,
        sakCount: entries.length,
        berat: entries.reduce((s, { item }) => s + (item.berat ?? 0), 0),
        hasPartial: false,
        isTemp: entries.some(({ isTemp }) => isTemp),
        chips,
        showSakMetric: false,
      };
    });
  }

  const bbGroups = buildBbGroups();
  const bonggolanGroups = buildBonggolanGroups();
  const groupCountByTab: Record<InputTab, number> = {
    bb: bbGroups.length,
    bonggolan: bonggolanGroups.length,
  };

  const activeGroups: InputLabelGroup[] = (() => {
    switch (selectedInputTab) {
      case "bonggolan":
        return bonggolanGroups;
      default:
        return bbGroups;
    }
  })();

  const catStats = (labels: number, items: readonly { berat?: number | null }[]) => ({
    labels,
    berat: items.reduce((s, i) => s + (i.berat ?? 0), 0),
  });

  const bbStats = catStats(bbGroups.length, bbAll);
  const bonggolanStats = catStats(bonggolanGroups.length, bonggolanAll);

  const grandBerat =
    bbAll.reduce((s, i) => s + (i.berat ?? 0), 0) +
    bonggolanAll.reduce((s, i) => s + (i.berat ?? 0), 0);
  const totalLabel = bbGroups.length + bonggolanGroups.length;

  const activeCatLabel: Record<InputTab, string> = {
    bb: "BB",
    bonggolan: "Bonggolan",
  };
  const activeCatStats =
    selectedInputTab === "bb" ? bbStats : bonggolanStats;

  // Output selalu 1 kategori tab: "Crusher" (bukan namaJenis produk).
  const outputTabCount = outputs.length;
  const outputTotalBerat = outputs.reduce((s, o) => s + o.berat, 0);
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
              {(["bb", "bonggolan"] as InputTab[])
                .filter((t) => isTabAllowed(t))
                .map((tab) => {
                  const labels: Record<InputTab, string> = {
                    bb: "Input BB",
                    bonggolan: "Input Bonggolan",
                  };
                  const counts: Record<InputTab, number> = {
                    bb: groupCountByTab.bb,
                    bonggolan: groupCountByTab.bonggolan,
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
                      label · {activeCatStats.berat.toFixed(2)} kg
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-800">
                    Total: {totalLabel} label · {grandBerat.toFixed(2)} kg
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
                Crusher
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
                {visibleOutputs.map((o) => (
                    <button
                      key={o.noCrusher}
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
                      <p className="truncate text-[10px] leading-snug text-gray-600" title={o.noCrusher}>
                        {o.noCrusher}
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

              {/* Footer: total kategori + total + Tambah Output */}
              <div
                className="shrink-0 space-y-1 border-t px-3 py-2"
                style={{ borderColor: "#E2E6EA", backgroundColor: "#F8F9FB" }}
              >
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-600">
                  {outputs.length > 0 ? (
                    <span>
                      Crusher: {outputs.length} label ·{" "}
                      {outputTotalBerat.toFixed(2)} kg
                    </span>
                  ) : (
                    <span className="text-gray-400">Belum ada total kategori</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-800">
                    Total: {visibleOutputs.length} label ·{" "}
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
        <CrusherOutputDetailDialog
          output={selectedOutput}
          canModify={!isLockedOrComplete}
          onClose={() => setSelectedOutput(null)}
          onChanged={() => {
            void getCrusherOutputsAction(noProduksi).then((res) => {
              if (res.ok) {
                setOutputs(res.outputs);
                const fresh = res.outputs.find(
                  (o) => o.noCrusher === selectedOutput.noCrusher,
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
        <CrusherOutputFormDialog
          noProduksi={noProduksi}
          tglProduksi={header.tglProduksi}
          idJenis={header.outputJenisId}
          namaJenis={header.outputJenisNama ?? ""}
          namaMesin={header.namaMesin}
          onClose={() => setOutputFormOpen(false)}
          onSaved={(noCrusher) => {
            setOutputFormOpen(false);
            showSnack(
              noCrusher
                ? `Label ${noCrusher} berhasil dibuat.`
                : "Label crusher berhasil dibuat.",
            );
            void getCrusherOutputsAction(noProduksi).then((res) => {
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
                Masukkan atau scan kode label (contoh: A.XXXXXXXXXX / M.XXXXXXXXXX)
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
                <X className="h-5 w-5" />
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
                <span className="mb-1 block text-xs font-medium text-gray-600">Jenis Crusher</span>
                <select
                  value={gantiJenisId}
                  onChange={(e) =>
                    setGantiJenisId(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">— Pilih jenis —</option>
                  {gantiTypes.map((t) => (
                    <option key={t.idCrusher} value={t.idCrusher}>
                      {t.namaCrusher}
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
            selectedLabelRef.tab === "bonggolan"
              ? bonggolanGroups
              : bbGroups;
          const liveGroup = groups.find(
            (g) => g.key === selectedLabelRef.key,
          );
          if (!liveGroup) return null;
          return (
            <CrusherInputLabelDialog
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
