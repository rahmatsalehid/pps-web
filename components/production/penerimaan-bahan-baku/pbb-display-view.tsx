"use client";

import { useEffect, useState } from "react";
import { connectDisplayView, type DisplayState } from "./pbb-display";
import { fmt } from "./pbb-potongan";

const FONT = "Calibri, 'Segoe UI', Arial, sans-serif";

export function PbbDisplayView() {
  const [state, setState] = useState<DisplayState | null>(null);

  useEffect(
    () =>
      connectDisplayView({
        onState: setState,
        onClose: () => window.close(),
      }),
    [],
  );

  useEffect(() => {
    const request = () => {
      if (document.fullscreenElement) return;
      void document.documentElement.requestFullscreen().catch(() => {
        /* abaikan */
      });
    };
    request();
    const retry = window.setTimeout(request, 600);
    window.addEventListener("resize", request);
    document.addEventListener("pointerdown", request);
    document.addEventListener("keydown", request);
    return () => {
      window.clearTimeout(retry);
      window.removeEventListener("resize", request);
      document.removeEventListener("pointerdown", request);
      document.removeEventListener("keydown", request);
    };
  }, []);

  const s = state;
  const weightText =
    s && s.weight != null && s.weight > 0 ? s.weight.toFixed(2) : "00.00";
  const rows = s?.saks ?? [];

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden text-white"
      style={{ backgroundColor: "#0078D7", fontFamily: FONT }}
    >
      <div className="flex shrink-0 items-end gap-3 border-b-2 border-white/40 px-4 pb-2 pt-3">
        <p className="shrink-0 text-[33px] leading-none">Supplier :</p>
        <p className="min-w-0 flex-1 truncate text-[33px] font-bold leading-none">
          {s?.supplier || "-"}
        </p>
        <div className="shrink-0 text-right">
          <p className="text-[28px] leading-none">
            Pallet Ke:{" "}
            <span className="font-bold">{s?.palletKe ?? 0}</span>
          </p>
          <p className="mt-1 text-[12px] opacity-80">
            {s?.noPenerimaan || ""}
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-3 p-3">
        <div className="relative flex min-w-0 flex-1 flex-col items-center justify-center rounded-lg border-2 border-white/40">
          <div className="flex items-end">
            <span
              className="font-bold leading-none tracking-tight"
              style={{ fontSize: 174 }}
            >
              {weightText}
            </span>
            <span className="pb-5 pl-3 text-[28px]">Kg</span>
          </div>
          <div className="absolute left-3 top-3 flex gap-2 text-[14px]">
            <span
              className="rounded px-2 py-0.5 font-bold"
              style={{
                backgroundColor: s?.connected ? "#16A34A" : "rgba(255,255,255,0.25)",
              }}
            >
              {s?.connected ? "Terhubung" : "Belum terhubung"}
            </span>
            {s?.active && (
              <span className="rounded bg-yellow-400 px-2 py-0.5 font-bold text-[#7A5A00]">
                AUTO
              </span>
            )}
          </div>
          {!s && (
            <p className="absolute bottom-3 text-[14px] opacity-80">
              Menunggu data dari tab utama…
            </p>
          )}
        </div>

        <div className="flex w-[324px] shrink-0 flex-col overflow-hidden rounded-lg border-2 border-white/40">
          <p className="shrink-0 border-b-2 border-white/40 px-3 py-2 text-[18px] font-bold">
            Data Detail
          </p>
          <div className="min-h-0 flex-1 overflow-auto bg-[#DCDCDC] text-[#111]">
            <table className="w-full border-collapse text-[15px]">
              <colgroup>
                <col style={{ width: "62px" }} />
                <col style={{ width: "78px" }} />
                <col style={{ width: "auto" }} />
                <col style={{ width: "96px" }} />
              </colgroup>
              <thead className="sticky top-0 bg-[#E8E8E8] text-[13px] font-bold">
                <tr>
                  <th className="px-1 py-1.5 text-center">NO.SAK</th>
                  <th className="px-1 py-1.5 text-center">JAM</th>
                  <th className="px-1 py-1.5 text-center">BERAT</th>
                  <th className="px-1 py-1.5 text-center">KONDISI</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 text-center text-[13px] text-gray-600"
                    >
                      Belum ada data
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr
                      key={r.noSak}
                      style={{
                        backgroundColor: i % 2 === 0 ? "#FFFFFF" : "#F0F8FF",
                        borderBottom: "1px solid #C8C8C8",
                      }}
                    >
                      <td className="px-1 py-1.5 text-center font-semibold">
                        {r.noSak}
                      </td>
                      <td className="px-1 py-1.5 text-center">{r.jam}</td>
                      <td className="px-1 py-1.5 text-center font-semibold">
                        {fmt(r.berat)}
                      </td>
                      <td className="px-1 py-1.5 text-center text-[13px]">
                        {r.kondisi}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-4 whitespace-nowrap border-t-2 border-white/40 px-5 py-2 text-[34px] leading-none">
        <p className="shrink-0">
          Jmlh Pallet: <span className="font-bold">{s?.jmlhPallet ?? 0}</span>
        </p>
        <p className="shrink-0">
          Jmlh Sak: <span className="font-bold">{s?.jmlhSak ?? 0}</span>
        </p>
        <p className="shrink-0">
          Jmlh Kg: <span className="font-bold">{s ? fmt(s.jmlhKg) : "0"}</span>{" "}
          <span className="text-[22px]">Kg</span>
        </p>
        <span className="flex-1" />
        <span
          className="shrink-0 rounded px-3 py-1 text-[14px] font-bold"
          style={{
            backgroundColor: s?.connected ? "#16A34A" : "rgba(255,255,255,0.25)",
          }}
        >
          {s?.connected
            ? s.active
              ? "TIMBANGAN AKTIF"
              : "TIMBANGAN TERHUBUNG"
            : "MENUNGGU TIMBANGAN"}
        </span>
      </div>
    </div>
  );
}
