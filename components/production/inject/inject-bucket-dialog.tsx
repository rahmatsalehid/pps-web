"use client";

import { useState } from "react";
import type { InjectBatchSubmitPayload } from "@/services/inject-service";
import { Loader2Icon, X } from "@/components/dashboard/icons";
import {
  BucketForm,
  emptyBucketForm,
  validateBucketForm,
  type BucketContext,
  type BucketFormValue,
} from "./inject-bucket-form";

const PRIMARY = "#0277BD";
const BORDER = "#E2E6EA";

export type BucketSubmitFields = Omit<InjectBatchSubmitPayload, "noProduksi">;

/**
 * Dialog input satu bucket jam Inject realtime. Mode "terminate" mengakhiri
 * produksi di tengah jam (hourEnd = jam terminate) dan selalu diperlakukan
 * sebagai bucket terakhir.
 */
export function InjectBucketDialog({
  mode,
  title,
  subtitle,
  hourStart,
  defaultHourEnd,
  ctx,
  onClose,
  onSubmit,
}: {
  mode: "bucket" | "terminate";
  title: string;
  subtitle: string;
  hourStart: string;
  /** Hanya mode terminate: jam akhir baru (default = jam sekarang). */
  defaultHourEnd?: string;
  ctx: BucketContext;
  onClose: () => void;
  /** Kembalikan pesan error, atau null bila sukses (dialog ditutup pemanggil). */
  onSubmit: (
    fields: BucketSubmitFields,
    hourEnd: string | null,
  ) => Promise<string | null>;
}) {
  const [form, setForm] = useState<BucketFormValue>(() =>
    emptyBucketForm(ctx.pcs?.counterCurrent ?? null),
  );
  const [downtime, setDowntime] = useState(false);
  const [keterangan, setKeterangan] = useState("");
  const [hourEnd, setHourEnd] = useState(defaultHourEnd ?? "");
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  const effectiveCtx: BucketContext =
    mode === "terminate" ? { ...ctx, isLast: true } : ctx;

  async function send(fields: BucketSubmitFields) {
    setBusy(true);
    setError(null);
    const err = await onSubmit(fields, mode === "terminate" ? hourEnd : null);
    setBusy(false);
    if (err) setError(err);
  }

  async function handleSubmit(skipWarning = false) {
    setError(null);
    if (downtime) {
      if (!keterangan.trim()) {
        setError("Keterangan wajib diisi untuk downtime");
        return;
      }
      await send({
        hourStart,
        isDowntime: true,
        keterangan: keterangan.trim(),
        items: [],
      });
      return;
    }
    if (mode === "terminate" && !/^\d{1,2}:\d{2}$/.test(hourEnd.trim())) {
      setError("Jam terminate wajib diisi");
      return;
    }
    const v = validateBucketForm(form, effectiveCtx);
    if (v.error || !v.fields) {
      setError(v.error ?? "Data tidak valid");
      return;
    }
    if (v.warnings.length > 0 && !skipWarning) {
      setWarnings(v.warnings);
      return;
    }
    setWarnings(null);
    await send({ hourStart, ...v.fields });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div
          className="flex items-start gap-2 px-5 py-3 text-white"
          style={{
            background:
              mode === "terminate"
                ? "linear-gradient(90deg,#B91C1C,#DC2626)"
                : `linear-gradient(90deg, ${PRIMARY}, #1565C0)`,
          }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{title}</p>
            <p className="truncate text-[11px] opacity-85">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded p-1 hover:bg-white/15 disabled:opacity-50"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
          {mode === "terminate" && (
            <label className="block">
              <span className="mb-0.5 block text-[11px] text-gray-500">
                Jam terminate (HourEnd baru)
              </span>
              <input
                type="time"
                value={hourEnd}
                onChange={(e) => setHourEnd(e.target.value)}
                className="h-9 w-40 rounded-lg border bg-gray-50 px-3 text-sm outline-none focus:ring-1"
                style={{ borderColor: BORDER }}
              />
            </label>
          )}

          {mode === "bucket" && (
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-amber-700">
              <input
                type="checkbox"
                checked={downtime}
                onChange={(e) => setDowntime(e.target.checked)}
              />
              Mesin berhenti (downtime) — tidak ada produksi di jam ini
            </label>
          )}

          {downtime ? (
            <label className="block">
              <span className="mb-0.5 block text-[11px] text-gray-500">
                Keterangan downtime (wajib, maks 500 karakter)
              </span>
              <textarea
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value.slice(0, 500))}
                rows={3}
                className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-1"
                style={{ borderColor: BORDER }}
                placeholder="Contoh: listrik padam"
              />
            </label>
          ) : (
            <BucketForm value={form} onChange={setForm} ctx={effectiveCtx} />
          )}

          {warnings && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
              <p className="mb-1 font-bold">Nilai tidak sesuai standar mesin:</p>
              <ul className="list-inside list-disc">
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setWarnings(null)}
                  className="rounded-full border border-amber-400 px-3 py-1 font-semibold"
                >
                  Perbaiki
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmit(true)}
                  className="rounded-full bg-amber-600 px-3 py-1 font-semibold text-white"
                >
                  Tetap simpan
                </button>
              </div>
            </div>
          )}

          {error && (
            <p
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>

        <div
          className="flex justify-end gap-2 border-t px-5 py-3"
          style={{ borderColor: BORDER }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex h-10 items-center rounded-full border border-gray-300 px-5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={busy || warnings != null}
            className="inline-flex h-10 items-center gap-1.5 rounded-full px-6 text-sm font-semibold text-white disabled:opacity-50"
            style={{
              backgroundColor: mode === "terminate" ? "#DC2626" : PRIMARY,
            }}
          >
            {busy && <Loader2Icon className="h-4 w-4 animate-spin" />}
            {mode === "terminate"
              ? "Terminate Produksi"
              : downtime
                ? "Catat Downtime"
                : "Simpan Jam"}
          </button>
        </div>
      </div>
    </div>
  );
}
