"use client";

import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/app/(app)/actions";
import type { SessionUser } from "@/services/auth-service";
import { LogOutIcon } from "./icons";

function getInitials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const initials = parts.length === 1 ? parts[0][0] : parts[0][0] + parts[1][0];
  return initials.toUpperCase();
}

export function UserMenu({ user }: { user: SessionUser }) {
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
        className="flex items-center gap-2 rounded-full py-1 pl-2 pr-1 hover:bg-gray-100"
      >
        <span className="hidden text-sm font-medium text-gray-700 sm:inline">
          {user.fullName || user.username}
        </span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
          {getInitials(user.fullName || user.username)}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-56 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-gray-800">
              {user.fullName || user.username}
            </p>
            <p className="truncate text-xs text-gray-400">
              {user.uGroupName ?? user.username}
            </p>
          </div>
          <div className="my-1 border-t border-gray-200" />
          <form action={logoutAction}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
            >
              <LogOutIcon className="h-4 w-4" />
              Logout
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
