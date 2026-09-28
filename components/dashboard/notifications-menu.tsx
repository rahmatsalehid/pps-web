"use client";

import { useEffect, useRef, useState } from "react";
import { BellIcon } from "./icons";

// Dummy data — belum ada sistem notifikasi sungguhan di backend.
const DUMMY_NOTIFICATIONS = [
  {
    title: "Produksi mesin M-04 selesai",
    time: "5 menit lalu",
  },
  {
    title: "Stock washing hampir habis",
    time: "1 jam lalu",
  },
  {
    title: "Mutasi barang menunggu approval",
    time: "3 jam lalu",
  },
];

export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Notifikasi"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
      >
        <BellIcon className="h-5 w-5" />
        {DUMMY_NOTIFICATIONS.length > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-orange-500" />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-72 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          <p className="px-3 py-2 text-sm font-semibold text-gray-800">
            Notifikasi
          </p>
          <div className="border-t border-gray-200">
            {DUMMY_NOTIFICATIONS.map((notification) => (
              <div
                key={notification.title}
                className="px-3 py-2 text-sm hover:bg-gray-50"
              >
                <p className="text-gray-800">{notification.title}</p>
                <p className="text-xs text-gray-400">{notification.time}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
