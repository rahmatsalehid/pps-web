"use client";

import { useEffect, useRef, useState } from "react";
import {
  createTradeInAction,
  getTradeInFormMetaAction,
} from "@/app/(app)/warehouse/trade-in/actions";
import type {
  TradeInRejectType,
  TradeInSalesPerson,
} from "@/services/trade-in-service";
import { Loader2Icon, X } from "@/components/dashboard/icons";
import { AssignmentReturnIcon, CalendarIcon } from "./trade-in-icons";

const PRIMARY = "#1E6FD9";
const BORDER = "#E2E6EA";

const FIELD_CLASS =
  "w-full rounded-[10px] border bg-[#F8F9FB] px-3 py-3 text-sm text-[#1A1D23] outline-none transition focus:border-[#1E6FD9] focus:ring-1 focus:ring-[#1E6FD9] placeholder:text-gray-400";

type ErrorDialog = { title: string; message: string } | null;

export function TradeInFormDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (noPenerimaan: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [salesPersons, setSalesPersons] = useState<TradeInSalesPerson[]>([]);
  const [rejectTypes, setRejectTypes] = useState<TradeInRejectType[]>([]);
  const [nextNo, setNextNo] = useState<string | null>(null);

  const [tanggal, setTanggal] = useState(() => todayISO());
  const [salesPersonCode, setSalesPersonCode] = useState("");
  const [supplier, setSupplier] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [idReject, setIdReject] = useState("");
  const [berat, setBerat] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [validation, setValidation] = useState<string | null>(null);
  const [errorDialog, setErrorDialog] = useState<ErrorDialog>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const dateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await getTradeInFormMetaAction();
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setSalesPersons(res.salesPersons);
        setRejectTypes(res.rejectTypes);
        setNextNo(res.nextNo);
        setLoadError(null);
      } else {
        setLoadError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const submit = async () => {
    if (submitting) return;
    if (
      !supplier.trim() ||
      !salesPersonCode ||
      !keterangan.trim() ||
      !idReject ||
      !berat.trim()
    ) {
      setValidation("Lengkapi semua field terlebih dahulu");
      return;
    }
    setValidation(null);
    setSubmitting(true);
    const res = await createTradeInAction({
      supplier: supplier.trim(),
      salesPersonCode,
      jenis: keterangan.trim(),
      tanggal,
      idReject: Number(idReject),
      berat: berat.trim(),
    });
    setSubmitting(false);
    if (!res.ok) {
      setErrorDialog({ title: "Gagal Menyimpan", message: res.error });
      return;
    }
    onSaved(res.noPenerimaan);
  };

  const openDatePicker = () => {
    const el = dateRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      try {
        el.showPicker();
        return;
      } catch {
        el.focus();
        return;
      }
    }
    el.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-[520px] flex-col overflow-hidden rounded-[14px] bg-white shadow-2xl">
        <div className="flex items-center gap-2.5 px-4 pb-3.5 pt-3.5">
          <span
            className="flex shrink-0 items-center justify-center rounded-[9px] p-2"
            style={{ backgroundColor: `${PRIMARY}17` }}
          >
            <AssignmentReturnIcon
              className="h-[18px] w-[18px]"
              style={{ color: PRIMARY }}
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-[#1A1D23]">
              Penerimaan Baru
            </p>
            <p className="text-[11px] text-[#6B7280]">{nextNo ?? "..."}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[#9CA3AF] hover:bg-gray-100"
            aria-label="Tutup"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="h-px bg-[#E2E6EA]" />

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3.5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
              <Loader2Icon className="h-4 w-4 animate-spin" /> Memuat data
              master…
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-red-600">{loadError}</p>
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white"
              >
                Coba lagi
              </button>
            </div>
          ) : (
            <>
              <FieldLabel text="Tanggal" />
              <button
                type="button"
                onClick={openDatePicker}
                className={`${FIELD_CLASS} flex items-center gap-2.5 text-left`}
              >
                <CalendarIcon className="h-4 w-4 shrink-0 text-gray-500" />
                <span className="truncate">{fmtTanggal(tanggal)}</span>
              </button>
              <input
                ref={dateRef}
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                tabIndex={-1}
                aria-label="Tanggal penerimaan"
                className="pointer-events-none absolute h-px w-px opacity-0"
              />

              <div className="h-4" />
              <FieldLabel text="Sales Person" />
              <select
                value={salesPersonCode}
                onChange={(e) => setSalesPersonCode(e.target.value)}
                className={FIELD_CLASS}
              >
                <option value="">Pilih sales person</option>
                {salesPersons.map((sp) => (
                  <option key={sp.code} value={sp.code}>
                    {sp.name}
                  </option>
                ))}
              </select>

              <div className="h-4" />
              <FieldLabel text="Supplier" />
              <input
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Nama supplier"
                className={FIELD_CLASS}
              />

              <div className="h-4" />
              <FieldLabel text="Keterangan" />
              <input
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Mis. plastik, kardus"
                className={FIELD_CLASS}
              />

              <div className="mt-5 border-t" style={{ borderColor: BORDER }} />
              <div className="h-2" />
              <p className="text-[13px] font-bold text-[#1A1D23]">Reject</p>
              <div className="h-3" />
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-[3]">
                  <FieldLabel text="Jenis Reject" />
                  <select
                    value={idReject}
                    onChange={(e) => setIdReject(e.target.value)}
                    className={FIELD_CLASS}
                  >
                    <option value="">Pilih jenis reject</option>
                    {rejectTypes.map((rt) => (
                      <option key={rt.idReject} value={String(rt.idReject)}>
                        {rt.namaReject}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-0 flex-1">
                  <FieldLabel text="Berat (kg)" />
                  <input
                    value={berat}
                    onChange={(e) => setBerat(e.target.value)}
                    placeholder="5,25"
                    inputMode="decimal"
                    className={FIELD_CLASS}
                  />
                </div>
              </div>

              {validation && (
                <p className="mt-3 text-[13px] font-semibold text-red-600">
                  {validation}
                </p>
              )}
            </>
          )}
        </div>

        <div className="h-px bg-[#E2E6EA]" />

        <div className="px-4 pb-4 pt-3">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={loading || submitting}
            className="flex w-full items-center justify-center gap-2 rounded-[10px] py-3.5 text-sm font-bold text-white transition disabled:opacity-70"
            style={{ backgroundColor: PRIMARY }}
          >
            {submitting && <Loader2Icon className="h-4 w-4 animate-spin" />}
            Simpan
          </button>
        </div>
      </div>

      {errorDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white p-5 shadow-2xl">
            <p className="text-sm font-bold text-gray-900">
              {errorDialog.title}
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
              {errorDialog.message}
            </p>
            <button
              type="button"
              onClick={() => setErrorDialog(null)}
              className="mt-4 w-full rounded-lg bg-[#E53935] py-2 text-sm font-bold text-white"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldLabel({ text }: { text: string }) {
  return (
    <p className="pb-1.5 text-[11.5px] font-bold text-gray-600">{text}</p>
  );
}

function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtTanggal(iso: string): string {
  const parts = iso.split("-").map(Number);
  const [y, m, d] = parts;
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
