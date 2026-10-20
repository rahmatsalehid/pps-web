"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { SessionUser } from "@/services/auth-service";
import { Clock } from "./clock";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";
import {
  BREADCRUMB_EXTRA_EVENT,
  resolveNavMeta,
  type BreadcrumbExtra,
} from "./nav-breadcrumb";
import { NotificationsMenu } from "./notifications-menu";
import { UserMenu } from "./user-menu";

export function AppHeader({
  user,
  collapsed,
  onToggleSidebar,
  onOpenMobileSidebar,
}: {
  user: SessionUser;
  collapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileSidebar: () => void;
}) {
  const pathname = usePathname();
  const baseMeta = resolveNavMeta(pathname);
  // Crumb tambahan dari halaman (mis. mode Tambah/Ubah), dikirim lewat event
  const [extra, setExtra] = useState<{
    path: string;
    label: string;
    onBack?: () => void;
  } | null>(
    null,
  );
  useEffect(() => {
    const onExtra = (e: Event) => {
      const detail = (e as CustomEvent<BreadcrumbExtra | null>).detail;
      setExtra(
        detail
          ? {
              path: window.location.pathname,
              label: detail.label,
              onBack: detail.onBack,
            }
          : null,
      );
    };
    window.addEventListener(BREADCRUMB_EXTRA_EVENT, onExtra);
    return () => window.removeEventListener(BREADCRUMB_EXTRA_EVENT, onExtra);
  }, []);
  const meta =
    extra && extra.path === pathname
      ? { ...baseMeta, crumbs: [...baseMeta.crumbs, { label: extra.label }] }
      : baseMeta;
  const headerRef = useRef<HTMLElement | null>(null);

  // Ukur tinggi header aktual (judul + breadcrumb) → CSS var --header-h
  // supaya halaman detail bisa hitung tinggi viewport dengan benar.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const apply = () => {
      document.documentElement.style.setProperty(
        "--header-h",
        `${el.offsetHeight}px`,
      );
    };
    apply();

    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-30 border-b border-slate-200 bg-white"
    >
      <div className="flex h-16 items-center gap-3 pr-4">
        {/* Tombol collapse sidebar */}
        <button
          onClick={onToggleSidebar}
          aria-label={collapsed ? "Buka menu" : "Tutup menu"}
          className="relative z-50 grid h-16 w-10 shrink-0 place-items-center rounded-r-[2rem] border-y border-r border-white/10 bg-gradient-to-b from-[#09111f] to-[#070d18] text-white shadow-[0_10px_20px_rgba(5,11,23,0.18)] transition-colors hover:from-[#111d31] hover:to-[#0d1728]"
        >
          <ChevronLeftIcon
            className={`h-4 w-4 transition-transform duration-200 ${
              collapsed ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          aria-label="Buka menu"
          className="relative z-40 flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 lg:hidden"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M4 6h16" />
            <path d="M4 12h16" />
            <path d="M4 18h16" />
          </svg>
        </button>

        {/* Logo di tab bar atas — selalu tampil (termasuk saat sidebar collapse) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {/*<img
          src="/logo2.png"
          alt="PPS Logo"
          className="relative z-40 h-9 w-9 shrink-0 rounded-lg object-contain ring-1 ring-slate-200"
        />
        */}

        {/* Judul */}
        <div className="min-w-0 flex-1 py-2">
          <p className="truncate text-[15px] font-semibold leading-tight text-slate-900">
            {meta.title}
          </p>
          <p className="truncate text-xs leading-tight text-slate-400">
            {meta.subtitle}
          </p>
        </div>

        {/* Kanan */}
        <div className="flex items-center gap-4">
          <div className="hidden min-w-[152px] items-center justify-center gap-2 border-r border-slate-200 pr-4 sm:flex">
            <Clock />
          </div>

          <NotificationsMenu />
          <UserMenu user={user} />
        </div>
      </div>

      {/* Breadcrumb — bisa diklik untuk kembali ke menu sesuai alamat */}
      {meta.crumbs.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className="flex min-h-9 flex-wrap items-center gap-1 border-t border-slate-100 bg-slate-50/70 px-4 py-1.5 sm:px-6"
        >
          {meta.crumbs.map((crumb, i) => {
            const isLast = i === meta.crumbs.length - 1;
            const clickable = Boolean(crumb.href) && !isLast;
            const onBack =
              extra && extra.path === pathname && i === meta.crumbs.length - 2
                ? extra.onBack
                : undefined;

            return (
              <span key={`${crumb.label}-${i}`} className="flex items-center gap-1">
                {i > 0 && (
                  <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                )}
                {clickable ? (
                  <Link
                    href={crumb.href!}
                    onClick={
                      onBack
                        ? (e) => {
                            e.preventDefault();
                            onBack();
                          }
                        : undefined
                    }
                    className="max-w-[14rem] truncate rounded px-1.5 py-0.5 text-xs font-medium text-slate-500 transition-colors hover:bg-white hover:text-blue-600 hover:underline"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    className={`max-w-[16rem] truncate rounded px-1.5 py-0.5 text-xs ${
                      isLast
                        ? "font-semibold text-slate-800"
                        : "text-slate-500"
                    }`}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {crumb.label}
                  </span>
                )}
              </span>
            );
          })}
        </nav>
      )}
    </header>
  );
}
