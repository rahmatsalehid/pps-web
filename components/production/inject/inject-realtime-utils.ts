import type {
  InjectBatchItem,
  InjectBatchLabels,
  InjectPcsPerLabelResult,
} from "@/services/inject-service";

/**
 * Logika bucket jam produksi Inject realtime (port dari tablet
 * inject_production_input_screen_v3): pembagian jam, status window input,
 * carry-over antar bucket, dan pembagian pcs menjadi label.
 */

export type BucketStatus = "locked" | "available" | "submitted" | "expired";

export type Bucket = {
  /** "08:00 - 09:00" */
  label: string;
  hourStart: string;
  hourEnd: string;
  start: Date;
  end: Date;
};

export type BucketState = {
  status: BucketStatus;
  /** Bucket terakhir, belum selesai, dan sudah lewat durasi window normal. */
  isOverdue: boolean;
  /** Terisi saat status locked (countdown "terbuka dalam"). */
  windowOpensAt: Date | null;
  /** Terisi saat available & bukan bucket terakhir (countdown "tertutup"). */
  windowClosesAt: Date | null;
  carryOverIn: number;
  carryOverInByJenis: Record<number, number>;
  pcsInput: number;
  pcsInputByJenis: Record<number, number>;
  labelsCreated: number;
  carryOverOut: number;
  carryOverOutByJenis: Record<number, number>;
  berat: number | null;
  cycleTime: number | null;
  counter: number | null;
  keterangan: string | null;
  isDowntime: boolean;
  labels: InjectBatchLabels;
};

const EMPTY_LABELS: InjectBatchLabels = {
  furnitureWip: [],
  barangJadi: [],
  bonggolan: [],
  reject: [],
};

/** Window input bucket terbuka 30 menit sebelum jamnya berakhir (tablet: 0). */
const INPUT_OPEN_DELAY_MS = -30 * 60_000;
const INPUT_WINDOW_MS = 60 * 60 * 1000;

function parseMinutes(v: string | null | undefined): number | null {
  const m = (v ?? "").trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export function formatHM(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Bagi rentang jam produksi menjadi bucket per jam (bucket pertama boleh pendek). */
export function computeBuckets(
  tglProduksi: string | null,
  hourStart: string | null,
  hourEnd: string | null,
): Bucket[] {
  const startMin = parseMinutes(hourStart);
  const endMin = parseMinutes(hourEnd);
  if (startMin == null || endMin == null) return [];

  let duration = endMin - startMin;
  if (duration <= 0) duration += 24 * 60;
  if (duration <= 0) return [];

  const [y, mo, d] = (tglProduksi ?? "").slice(0, 10).split("-").map(Number);
  const anchor =
    y && mo && d ? new Date(y, mo - 1, d) : new Date(new Date().setHours(0, 0, 0, 0));
  const startDt = new Date(anchor.getTime() + startMin * 60_000);

  const startRemainder = startMin % 60;
  const firstStep = startRemainder === 0 ? 60 : 60 - startRemainder;
  const buckets: Bucket[] = [];
  let offset = 0;
  while (offset < duration) {
    const step = offset === 0 && startRemainder !== 0 ? firstStep : 60;
    const next = Math.min(offset + step, duration);
    const start = new Date(startDt.getTime() + offset * 60_000);
    const end = new Date(startDt.getTime() + next * 60_000);
    buckets.push({
      label: `${formatHM(start)} - ${formatHM(end)}`,
      hourStart: formatHM(start),
      hourEnd: formatHM(end),
      start,
      end,
    });
    offset = next;
  }
  return buckets;
}

/**
 * Bagi total pcs jadi label, menghormati target awal yang direduksi (defisit
 * produksi sebelumnya) bila ada dan belum terpakai.
 */
export function splitIntoLabels(args: {
  totalPcs: number;
  standardPpl: number;
  initialPpl: number | null;
  alreadyConsumedInitial: boolean;
}): { labelsCreated: number; carryOverOut: number } {
  const { totalPcs, standardPpl, initialPpl, alreadyConsumedInitial } = args;
  let remaining = totalPcs;
  let labels = 0;
  if (!alreadyConsumedInitial && initialPpl != null && initialPpl > 0) {
    if (remaining >= initialPpl) {
      labels += 1;
      remaining -= initialPpl;
    } else {
      return { labelsCreated: 0, carryOverOut: remaining };
    }
  }
  const ppl = Math.max(1, standardPpl);
  labels += Math.floor(remaining / ppl);
  return { labelsCreated: labels, carryOverOut: remaining % ppl };
}

export function pplForJenis(
  pcs: InjectPcsPerLabelResult | null,
  idJenis: number,
): number {
  const found = pcs?.items.find((i) => i.idJenis === idJenis);
  if (found) return Math.max(1, found.pcsPerLabel);
  if (pcs && pcs.items.length > 0) return Math.max(1, pcs.items[0].pcsPerLabel);
  return 100;
}

export function initialPplForJenis(
  pcs: InjectPcsPerLabelResult | null,
  idJenis: number,
  discarded: ReadonlySet<number>,
): number | null {
  if (discarded.has(idJenis)) return null;
  return pcs?.items.find((i) => i.idJenis === idJenis)?.pcsPerLabelAwal ?? null;
}

function emptyState(status: BucketStatus): BucketState {
  return {
    status,
    isOverdue: false,
    windowOpensAt: null,
    windowClosesAt: null,
    carryOverIn: 0,
    carryOverInByJenis: {},
    pcsInput: 0,
    pcsInputByJenis: {},
    labelsCreated: 0,
    carryOverOut: 0,
    carryOverOutByJenis: {},
    berat: null,
    cycleTime: null,
    counter: null,
    keterangan: null,
    isDowntime: false,
    labels: EMPTY_LABELS,
  };
}

/** State bucket yang sudah disubmit, dipulihkan dari batch di server. */
function restoreSubmitted(
  batch: InjectBatchItem,
  isLast: boolean,
  pcs: InjectPcsPerLabelResult | null,
  consumed: Set<number>,
): BucketState {
  const st = emptyState("submitted");
  let labelsCreated = 0;

  if (!batch.isDowntime) {
    if (batch.jenisItems.length > 0) {
      for (const ji of batch.jenisItems) {
        st.carryOverInByJenis[ji.idJenis] = ji.carryOverIn;
        st.pcsInputByJenis[ji.idJenis] = ji.pcsInput;
        st.carryOverOutByJenis[ji.idJenis] = ji.carryOverOut;
        const ppl = pplForJenis(pcs, ji.idJenis);
        const total = ji.carryOverIn + ji.pcsInput;
        if (isLast) {
          labelsCreated += Math.floor(total / ppl) + (total % ppl > 0 ? 1 : 0);
        } else {
          const split = splitIntoLabels({
            totalPcs: total,
            standardPpl: ppl,
            initialPpl:
              pcs?.items.find((i) => i.idJenis === ji.idJenis)?.pcsPerLabelAwal ??
              null,
            alreadyConsumedInitial: consumed.has(ji.idJenis),
          });
          labelsCreated += split.labelsCreated;
          if (split.labelsCreated > 0) consumed.add(ji.idJenis);
        }
      }
    } else {
      const ppl = pcs && pcs.items.length > 0 ? Math.max(1, pcs.items[0].pcsPerLabel) : 100;
      const total = batch.carryOverIn + batch.pcsInput;
      labelsCreated = isLast
        ? Math.floor(total / ppl) + (total % ppl > 0 ? 1 : 0)
        : Math.floor(total / ppl);
    }
  }

  return {
    ...st,
    carryOverIn: batch.carryOverIn,
    pcsInput: batch.pcsInput,
    labelsCreated,
    carryOverOut: batch.carryOverOut,
    berat: batch.berat,
    cycleTime: batch.cycleTime,
    counter: batch.counter,
    keterangan: batch.keterangan,
    isDowntime: batch.isDowntime,
    labels: batch.labels,
  };
}

/**
 * Turunkan state seluruh bucket dari batch server + waktu sekarang. Bucket
 * yang belum disubmit mewarisi carry-over dari bucket submitted terakhir.
 */
export function deriveBucketStates(args: {
  buckets: Bucket[];
  batches: InjectBatchItem[];
  pcs: InjectPcsPerLabelResult | null;
  isComplete: boolean;
  now: Date;
}): { states: Map<string, BucketState>; consumedJenis: Set<number> } {
  const { buckets, batches, pcs, isComplete, now } = args;
  const states = new Map<string, BucketState>();
  const consumed = new Set<number>();
  const byStart = new Map(batches.map((b) => [b.hourStart, b]));
  const lastLabel = buckets.length > 0 ? buckets[buckets.length - 1].label : null;

  const opensAt = buckets.map(
    (b) => new Date(b.end.getTime() + INPUT_OPEN_DELAY_MS),
  );

  let lastCarryOut = 0;
  let lastCarryOutByJenis: Record<number, number> = {};

  buckets.forEach((b, i) => {
    const batch = byStart.get(b.hourStart);
    if (batch) {
      const st = restoreSubmitted(batch, b.label === lastLabel, pcs, consumed);
      states.set(b.label, st);
      lastCarryOut = st.carryOverOut;
      lastCarryOutByJenis = { ...st.carryOverOutByJenis };
      return;
    }

    const isLastAndIncomplete = !isComplete && b.label === lastLabel;
    const closesAt = i + 1 < opensAt.length ? opensAt[i + 1] : null;

    let status: BucketStatus;
    if (closesAt && now >= closesAt && !isLastAndIncomplete) status = "expired";
    else if (now >= opensAt[i]) status = "available";
    else status = "locked";

    const nominalClosesAt =
      closesAt ?? new Date(opensAt[i].getTime() + INPUT_WINDOW_MS);
    const isActive = status === "available" || status === "expired";

    const st = emptyState(status);
    st.isOverdue = isLastAndIncomplete && now >= nominalClosesAt;
    st.windowOpensAt = status === "locked" ? opensAt[i] : null;
    st.windowClosesAt = status === "available" && closesAt ? closesAt : null;
    st.carryOverIn = isActive ? lastCarryOut : 0;
    st.carryOverInByJenis = isActive ? { ...lastCarryOutByJenis } : {};
    states.set(b.label, st);
  });

  return { states, consumedJenis: consumed };
}

export function formatCountdown(target: Date, now: Date): string {
  const s = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
