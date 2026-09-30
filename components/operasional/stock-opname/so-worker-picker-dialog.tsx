"use client";

import { useEffect, useMemo, useState } from "react";
import { getSoUsersAction } from "@/app/(app)/operasional/stock-opname/actions";
import type { SoAccessUser } from "@/services/stock-opname-v2-service";
import { Loader2Icon } from "@/components/dashboard/icons";
import {
  SoAlertIcon,
  SoArrowRightIcon,
  SoCloseIcon,
  SoPersonAddIcon,
  SoSearchIcon,
} from "./so-icons";

const PRIMARY = "#1E6FD9";
const BORDER = "#E2E6EA";
const ONLINE = "#0A7349";

const AVATAR_PALETTE = [
  "#1E6FD9",
  "#7C3AED",
  "#DB2777",
  "#EA580C",
  "#0A7349",
  "#0891B2",
  "#B45309",
  "#4F46E5",
];

export function SoWorkerPickerDialog({
  onPick,
  onClose,
}: {
  onPick: (user: SoAccessUser) => void;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<SoAccessUser[]>([]);
  const [query, setQuery] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await getSoUsersAction();
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setError(null);
      setUsers(
        [...res.users].sort((a, b) => {
          if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
          return a.username.toLowerCase().localeCompare(b.username.toLowerCase());
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        fullName(u).toLowerCase().includes(q),
    );
  }, [query, users]);

  const onlineCount = users.filter((u) => u.isOnline).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-[400px] flex-col overflow-hidden rounded-[20px] bg-white shadow-2xl">
        <div className="flex items-start gap-3 px-5 pt-5">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
            style={{ backgroundColor: `${PRIMARY}1A`, color: PRIMARY }}
          >
            <SoPersonAddIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15.5px] font-bold text-[#1A1D23]">
              Tugaskan User
            </p>
            <p className="mt-0.5 text-xs text-[#8A94A6]">
              {loading
                ? "Memuat daftar user..."
                : `${onlineCount} user sedang online`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[#8A94A6] hover:bg-gray-100"
            aria-label="Tutup"
          >
            <SoCloseIcon style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div className="px-5 pb-3 pt-4">
          <div
            className="relative rounded-xl border bg-[#F4F6F8]"
            style={{ borderColor: BORDER }}
          >
            <SoSearchIcon
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8A94A6]"
              style={{ width: 19, height: 19 }}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              placeholder="Cari nama atau username..."
              className="h-10 w-full rounded-xl border-none bg-transparent pl-9 pr-9 text-[13.5px] text-[#1A1D23] outline-none placeholder:text-gray-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-[#8A94A6] hover:bg-gray-200"
                aria-label="Bersihkan pencarian"
              >
                <SoCloseIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-3 pb-3">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
              <Loader2Icon className="h-5 w-5 animate-spin" />
            </div>
          )}
          {!loading && error && (
            <div className="py-8 text-center">
              <SoAlertIcon
                className="mx-auto text-red-300"
                style={{ width: 32, height: 32 }}
              />
              <p className="mt-2.5 text-[12.5px] font-semibold text-red-700">
                {error}
              </p>
              <button
                type="button"
                onClick={() => setRetryKey((k) => k + 1)}
                className="mt-2 text-xs font-bold text-[#1E6FD9] underline"
              >
                Coba Lagi
              </button>
            </div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-[12.5px] text-[#8A94A6]">
                Tidak ada user ditemukan
              </p>
            </div>
          )}
          {!loading &&
            !error &&
            filtered.map((user) => (
              <button
                key={user.idUsername}
                type="button"
                onClick={() => onPick(user)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-[#F4F6F8]"
              >
                <span className="relative shrink-0">
                  <span
                    className="grid h-9 w-9 place-items-center rounded-full text-sm font-bold"
                    style={{
                      backgroundColor: `${AVATAR_PALETTE[user.idUsername % AVATAR_PALETTE.length]}24`,
                      color: AVATAR_PALETTE[user.idUsername % AVATAR_PALETTE.length],
                    }}
                  >
                    {user.username.trim()
                      ? user.username.trim()[0].toUpperCase()
                      : "?"}
                  </span>
                  {user.isOnline && (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white"
                      style={{ backgroundColor: ONLINE }}
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-[#1A1D23]">
                    {user.username}
                  </span>
                  {fullName(user) && (
                    <span className="block truncate text-[11px] text-[#8A94A6]">
                      {fullName(user)}
                    </span>
                  )}
                </span>
                <SoArrowRightIcon className="h-4 w-4 shrink-0 text-gray-300" />
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}

function fullName(user: SoAccessUser): string {
  return [user.fName, user.lName].filter((s) => s && s.trim()).join(" ");
}
