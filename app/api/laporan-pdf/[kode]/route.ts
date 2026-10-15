import type { NextRequest } from "next/server";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";

const REPORT_API_URL =
  process.env.REPORT_API_URL ?? "http://192.168.11.79:7500";
const BACKEND_API_URL =
  process.env.BACKEND_API_URL ?? "http://localhost:5002";

const PDF_SOURCES: Record<string, (search: string) => string> = {
  "bongkar-susun": (search) =>
    `${REPORT_API_URL}/api/bongkar-susun-v2/laporan/pdf${search}`,
  "sortir-reject": (search) =>
    `${REPORT_API_URL}/api/sortir-reject-v2/laporan/pdf${search}`,
  "stok-broker-qc": (search) =>
    `${BACKEND_API_URL}/api/laporan/broker/stok-qc/pdf${search}`,
  "stok-barang-jadi-v2": (search) =>
    `${BACKEND_API_URL}/api/laporan/barang-jadi/stok-v2/pdf${search}`,
  "stok-barang-dagang": (search) =>
    `${BACKEND_API_URL}/api/laporan/barang-dagang/stok/pdf${search}`,
  "stok-barang-dagang-v2": (search) =>
    `${BACKEND_API_URL}/api/laporan/barang-dagang/stok-v2/pdf${search}`,
};

/** Cek laporan:read di backend (GET /api/auth/me) sebelum meneruskan PDF. */
async function hasLaporanAccess(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { permissions?: string[] | null };
    const perms = body.permissions ?? [];
    return perms.includes("*") || perms.includes("laporan:read");
  } catch {
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kode: string }> },
) {
  const { kode } = await params;
  const buildUrl = PDF_SOURCES[kode];
  if (!buildUrl) {
    return Response.json(
      { success: false, message: "Laporan PDF tidak dikenal" },
      { status: 404 },
    );
  }
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
  if (!token) {
    return Response.json(
      { success: false, message: "Sesi login tidak ditemukan" },
      { status: 401 },
    );
  }
  if (!(await hasLaporanAccess(token))) {
    return Response.json(
      {
        success: false,
        message: "Forbidden: permission laporan:read dibutuhkan",
      },
      { status: 403 },
    );
  }
  try {
    const upstream = await fetch(buildUrl(request.nextUrl.search), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/pdf",
      },
      cache: "no-store",
    });
    if (!upstream.ok) {
      const text = await upstream.text();
      let message = `Gagal memuat laporan (HTTP ${upstream.status})`;
      try {
        const body = JSON.parse(text) as { message?: string };
        if (body.message) message = body.message;
      } catch {
        message = text.slice(0, 300) || message;
      }
      return Response.json(
        { success: false, message },
        { status: upstream.status },
      );
    }
    const filename = `laporan-${kode}.pdf`;
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gagal menghubungi server laporan";
    return Response.json({ success: false, message }, { status: 502 });
  }
}
