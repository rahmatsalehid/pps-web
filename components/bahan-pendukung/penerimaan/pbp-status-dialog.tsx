"use client";

import { CheckCircleSolidIcon, ErrorIcon } from "./pbp-icons";

export function PbpStatusDialog({
  type,
  title,
  message,
  onClose,
}: {
  type: "success" | "error";
  title: string;
  message: string;
  onClose: () => void;
}) {
  const color = type === "success" ? "#43A047" : "#E53935";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-[380px] overflow-hidden rounded-[20px] bg-white px-8 pb-7 pt-8 shadow-2xl">
        <div className="flex justify-center">
          <span style={{ color }} className="scale-110">
            {type === "success" ? (
              <CheckCircleSolidIcon className="h-[74px] w-[74px]" />
            ) : (
              <ErrorIcon className="h-[74px] w-[74px]" />
            )}
          </span>
        </div>
        <p className="mt-4 text-center text-[17px] font-bold leading-snug text-[#1A1D23]">
          {title}
        </p>
        <p className="mt-2 text-center text-[13.5px] leading-relaxed text-[#8A94A6]">
          {message}
        </p>
        <div className="mt-7 border-t border-gray-100 pt-5">
          <button
            type="button"
            onClick={onClose}
            className="h-[46px] w-full rounded-[10px] text-sm font-bold text-white"
            style={{ backgroundColor: color }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
