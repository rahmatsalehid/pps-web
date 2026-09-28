"use client";

import { useState, type ReactNode } from "react";
import type { SessionUser } from "@/services/auth-service";
import { AppHeader } from "./app-header";
import { Sidebar } from "./sidebar";

export function DashboardShell({
  user,
  children,
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    // Jangan taruh overflow-hidden di atas aside fixed (iOS Safari: tap bisa mati)
    <div className="flex h-svh w-full bg-white">
      <Sidebar
        open={mobileOpen}
        collapsed={collapsed}
        onClose={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader
          user={user}
          collapsed={collapsed}
          onToggleSidebar={() => setCollapsed((v) => !v)}
          onOpenMobileSidebar={() => setMobileOpen(true)}
        />
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white p-3 sm:p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
