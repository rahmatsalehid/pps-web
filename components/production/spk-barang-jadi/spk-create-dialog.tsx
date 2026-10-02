"use client";

import { useMemo, useState } from "react";
import type { SpkMonitoringItem } from "@/services/spk-barang-jadi-service";
import { X } from "@/components/dashboard/icons";
import {
  spkFormatNumber,
  spkIsMpqMultiple,
  spkStatusMeta,
} from "./spk-format";
import { SpkWarningIcon } from "./spk-icons";

const BORDER = "#E2E6EA";
const PRIMARY = "#1E6FD9";
const MUTED = "#6B7280";
const INK = "#1A1D23";
const WARNING = "#B45309";
const WARNING_BG = "#FFF7ED";

export function SpkCreateDialog({
  items,
  busy = false,
  error,
  onCancel,
  onConfirm,
}: {
  items: SpkMonitoringItem[];
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (payload: {
    items: Array<{ idBJ: number; qtySpk: number }>;
    keterangan: string;
  }) => void;
}) {
  const [qtys, setQtys] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const item of items) initial[item.idBJ] = String(item.qtyRekomendasi);
    return initial;
  });
  const [keterangan, setKeterangan] = useState("");

  const rows = useMemo(() => {
    return items.map((item) => {
      const raw = qtys[item.idBJ] ?? "";
      const qty = Number(raw);
      const valid = raw.trim() !== "" && Number.isFinite(qty) && qty > 0;
      const mpqOk = spkIsMpqMultiple(qty, item.mpq);
      return { item, raw, qty, valid, mpqOk };
    });
  }, [items, qtys]);

  const allValid = rows.length > 0 && rows.every((r) => r.valid);
  const totalQty = rows.reduce((sum, r) => (r.valid ? sum + r.qty : sum), 0);
  const hasMpqWarning = rows.some((r) => r.valid && !r.mpqOk);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[88vh] w-full max-w-[720px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div
          className="flex items-start gap-3 px-5 py-4"
          style={{
            backgroundColor: "#F8F9FB",
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-extrabold tracking-tight text-[#1A1D23]">
              Buat SPK Produksi
            </p>
            <p className="mt-0.5 text-xs text-[#6B7280]">
              Periksa dan sesuaikan qty sebelum SPK dibuat
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-md p-1 text-[#8A94A6] hover:bg-gray-100 disabled:opacity-50"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-5">
          <div
            className="overflow-hidden rounded-md border"
            style={{ borderColor: BORDER }}
          >
            <div
              className="flex items-center gap-2 bg-[#FAFAFA] px-3 py-2"
              style={{ borderBottom: `1px solid ${BORDER}` }}
            >
              <span className="min-w-0 flex-[3] text-[9.5px] font-bold uppercase tracking-[0.3px] text-[#6B7280]">
                Barang
              </span>
              <span className="flex-1 text-right text-[9.5px] font-bold uppercase tracking-[0.3px] text-[#6B7280]">
                Stok
              </span>
              <span className="flex-1 text-right text-[9.5px] font-bold uppercase tracking-[0.3px] text-[#6B7280]">
                Rekomendasi
              </span>
              <span className="flex-1 text-right text-[9.5px] font-bold uppercase tracking-[0.3px] text-[#6B7280]">
                MPQ
              </span>
              <span className="w-[130px] text-right text-[9.5px] font-bold uppercase tracking-[0.3px] text-[#6B7280]">
                Qty SPK
              </span>
            </div>

            {rows.map(({ item, raw, valid, mpqOk }) => {
              const status = spkStatusMeta(item.status);
              return (
                <div
                  key={item.idBJ}
                  className="border-b px-3 py-2.5 last:border-b-0"
                  style={{
                    borderColor: "#F0F2F5",
                    backgroundColor: valid && !mpqOk ? WARNING_BG : undefined,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-[3]">
                      <p
                        className="truncate text-xs font-semibold"
                        style={{ color: INK }}
                        title={item.namaBJ}
                      >
                        {item.namaBJ}
                      </p>
                      <p className="truncate text-[10.5px] text-[#6B7280]">
                        {item.itemCode} &middot; {item.uom} &middot;{" "}
                        <span style={{ color: status.color }}>
                          {status.label}
                        </span>
                      </p>
                    </div>
                    <span
                      className="flex-1 text-right text-xs font-bold"
                      style={{ color: INK }}
                    >
                      {spkFormatNumber(item.stock)}
                    </span>
                    <span
                      className="flex-1 text-right text-xs"
                      style={{ color: PRIMARY }}
                    >
                      {spkFormatNumber(item.qtyRekomendasi)}
                    </span>
                    <span
                      className="flex-1 text-right text-xs"
                      style={{ color: MUTED }}
                    >
                      {spkFormatNumber(item.mpq)}
                    </span>
                    <span className="w-[130px] text-right">
                      <input
                        type="number"
                        min={0}
                        value={raw}
                        onChange={(e) =>
                          setQtys((prev) => ({
                            ...prev,
                            [item.idBJ]: e.target.value,
                          }))
                        }
                        className={`h-8 w-full rounded-md border px-2 text-right text-xs font-bold outline-none transition ${
                          valid ? "" : "border-red-300 bg-red-50"
                        }`}
                        style={{ borderColor: valid ? BORDER : undefined, color: INK }}
                      />
                    </span>
                  </div>
                  {!valid && (
                    <p className="mt-1 text-[10.5px] font-semibold text-red-600">
                      Qty SPK harus lebih dari 0
                    </p>
                  )}
                  {valid && !mpqOk && (
                    <div className="mt-1 flex items-center gap-1.5 text-[10.5px] font-semibold">
                      <SpkWarningIcon
                        style={{ width: 12, height: 12, color: WARNING }}
                      />
                      <span style={{ color: WARNING }}>
                        Qty belum kelipatan MPQ ({spkFormatNumber(item.mpq)})
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {hasMpqWarning && (
            <div
              className="mt-3 flex items-start gap-2.5 rounded-lg border px-3 py-3"
              style={{
                backgroundColor: WARNING_BG,
                borderColor: `${WARNING}4D`,
              }}
            >
              <SpkWarningIcon
                className="mt-0.5 shrink-0"
                style={{ width: 16, height: 16, color: WARNING }}
              />
              <p
                className="text-xs font-semibold leading-relaxed"
                style={{ color: WARNING }}
              >
                Ada qty yang tidak kelipatan MPQ. Qty akan tetap dibuat sesuai
                input Anda.
              </p>
            </div>
          )}

          <div className="mt-4">
            <label
              className="text-[10.5px] font-extrabold uppercase tracking-[0.4px]"
              style={{ color: MUTED }}
              htmlFor="spk-keterangan"
            >
              Keterangan (opsional)
            </label>
            <input
              id="spk-keterangan"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              maxLength={255}
              placeholder="Contoh: produksi untuk stok bulan ini"
              className="mt-1 h-10 w-full rounded-[10px] border bg-[#F3F5F8] px-3 text-sm outline-none transition focus:border-[#1E6FD9]"
              style={{ borderColor: BORDER }}
            />
          </div>

          {error && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {error}
            </p>
          )}
        </div>

        <div
          className="flex flex-wrap items-center gap-2.5 border-t px-5 py-4"
          style={{ borderColor: BORDER }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.4px] text-[#6B7280]">
              {rows.length} barang dipilih
            </p>
            <p className="text-sm font-extrabold text-[#1A1D23]">
              Total Qty: {spkFormatNumber(totalQty)}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-md border px-4 py-2.5 text-[13px] font-semibold text-[#6B7280] hover:bg-gray-50 disabled:opacity-50"
            style={{ borderColor: BORDER }}
          >
            Batal
          </button>
          <button
            type="button"
            disabled={busy || !allValid}
            onClick={() =>
              onConfirm({
                items: rows.map((r) => ({ idBJ: r.item.idBJ, qtySpk: r.qty })),
                keterangan: keterangan.trim(),
              })
            }
            className="flex items-center justify-center gap-2 rounded-md px-5 py-2.5 text-[13px] font-bold text-white transition disabled:opacity-60"
            style={{ backgroundColor: PRIMARY }}
          >
            {busy ? "Membuat SPK..." : "Buat SPK"}
          </button>
        </div>
      </div>
    </div>
  );
}
