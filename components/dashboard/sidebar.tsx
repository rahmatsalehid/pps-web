"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, X } from "./icons";
import { NAV_SECTIONS, type NavItem } from "./nav-items";

function isPathActive(pathname: string, href: string): boolean {
  if (!href || href === "#") return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  isActive,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={(event) => {
        if (item.href === "#") event.preventDefault();
        onNavigate?.();
      }}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
        isActive
          ? "bg-blue-600 text-white shadow-sm"
          : "text-slate-300 hover:bg-white/5 hover:text-white"
      }`}
    >
      {Icon ? (
        <Icon
          className={`h-[18px] w-[18px] shrink-0 ${
            isActive ? "text-white" : "text-slate-300 group-hover:text-white"
          }`}
        />
      ) : (
        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isActive ? "bg-white" : "bg-slate-500"
            }`}
          />
        </span>
      )}
      <span className="text-white">{item.label}</span>
    </Link>
  );
}

function NavGroup({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const hasActiveChild =
    item.children?.some((child) => isPathActive(pathname, child.href)) ?? false;

  const [expanded, setExpanded] = useState(() => hasActiveChild);
  const Icon = item.icon;

  return (
    <div>
      <div
        className={`group flex items-center rounded-lg text-sm font-medium transition-colors ${
          hasActiveChild ? "bg-blue-600 shadow-sm" : "hover:bg-white/5"
        }`}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-3 px-3 py-2.5"
        >
          {Icon && (
            <Icon
              className={`h-[18px] w-[18px] shrink-0 ${
                hasActiveChild ? "text-white" : "text-slate-300 group-hover:text-white"
              }`}
            />
          )}
          <span className="text-white">{item.label}</span>
        </button>
        <button
          onClick={() => setExpanded((v) => !v)}
          className={`px-2.5 py-2.5 ${
            hasActiveChild ? "text-white/80" : "text-slate-500 hover:text-slate-300"
          }`}
          aria-label={expanded ? "Tutup submenu" : "Buka submenu"}
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-300 ease-out ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
        inert={!expanded}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="ml-[26px] mt-1 space-y-0.5 border-l border-white/10 pl-3 pb-1">
            {item.children?.map((child) => {
              const ChildIcon = child.icon;
              const childActive = isPathActive(pathname, child.href);
              return (
                <Link
                  key={child.label}
                  href={child.href}
                  onClick={(event) => {
                    if (child.href === "#") event.preventDefault();
                    onNavigate?.();
                  }}
                  className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] text-white transition-colors duration-200 ${
                    childActive ? "font-medium" : "hover:bg-white/5"
                  }`}
                >
                  {ChildIcon && (
                    <ChildIcon
                      className={`h-3.5 w-3.5 shrink-0 transition-colors duration-200 ${
                        childActive ? "text-blue-200" : "text-white/70"
                      }`}
                    />
                  )}
                  <span className="text-white">{child.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({
  open,
  collapsed = false,
  onClose,
}: {
  open: boolean;
  collapsed?: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-900/50 transition-opacity duration-300 ease-out lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-64 flex-col overflow-hidden bg-[#0a0f1c] text-slate-300 transition-[transform,width] duration-300 ease-out lg:sticky lg:top-0 lg:translate-x-0 lg:min-w-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "lg:w-0" : ""}`}
      >
        <div className="flex h-full w-64 shrink-0 flex-col">
          {/* Brand */}
          <div className="flex items-start justify-between gap-2 px-5 pb-4 pt-5">
            <Link href="/" className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo2.png"
                alt="PPS Logo"
                className="h-10 w-10 shrink-0 rounded-xl object-contain ring-1 ring-white/10"
              />
              <span className="leading-tight">
                <span className="block text-base font-bold text-white">PPS</span>
                <span className="block text-[11px] text-slate-400">Plastic Production System</span>
              </span>
            </Link>
            <button
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 lg:hidden"
              onClick={onClose}
              aria-label="Tutup menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mx-5 border-t border-white/10" />

          {/* Navigation */}
          <nav className="no-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-4 pt-4">
            {NAV_SECTIONS.map((section, index) => (
              <div key={section.title ?? index}>
                {section.title && (
                  <p className="px-3 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {section.title}
                  </p>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) =>
                    item.children && item.children.length > 0 ? (
                      <NavGroup
                        key={item.label}
                        item={item}
                        pathname={pathname}
                        onNavigate={onClose}
                      />
                    ) : (
                      <NavLink
                        key={item.label}
                        item={item}
                        isActive={isPathActive(pathname, item.href)}
                        onNavigate={onClose}
                      />
                    ),
                  )}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}
