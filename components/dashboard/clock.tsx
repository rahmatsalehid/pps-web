"use client";

import { useEffect, useState } from "react";

function ClockIcon() {
  return (
    <svg
      className="h-4 w-4 text-slate-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function formatHeaderDate(date: Date): string {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sept", "Oct", "Nov", "Dec",
  ];
  return `${String(date.getDate()).padStart(2, "0")} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export function Clock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const time = now
    ? now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "";

  const date = now ? formatHeaderDate(now) : "";

  return (
    <div className="hidden min-w-[152px] items-center justify-center gap-2 border-r border-slate-200 pr-4 sm:flex">
      <ClockIcon />
      <div className="min-w-[104px] text-center leading-tight">
        <p className="font-mono text-sm font-semibold tabular-nums text-slate-800">
          {time || "--:--"}
        </p>
        <p className="text-[11px] text-slate-400">
          {date || "-- --- ----"}
        </p>
      </div>
    </div>
  );
}
