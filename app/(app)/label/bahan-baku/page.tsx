import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  AUTH_TOKEN_COOKIE,
  fetchMyPermissions,
  hasPermission,
} from "@/services/auth-service";
import { LbWorkspace } from "@/components/label/bahan-baku/lb-workspace";

export const metadata: Metadata = {
  title: "Label Bahan Baku — PPS",
};

export default async function LabelBahanBakuPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;

  let canView = false;
  let canQc = false;
  try {
    const me = await fetchMyPermissions(token);
    const perms = me.data.permissions;
    canView = hasPermission(perms, "label_bahanbaku:read");
    canQc =
      hasPermission(perms, "label_bahanbaku:update") ||
      hasPermission(perms, "qc_label:update") ||
      hasPermission(perms, "penerimaanbahanbaku:update");
  } catch {
    canView = false;
    canQc = false;
  }

  if (!canView) {
    return <AccessDenied />;
  }

  return <LbWorkspace canQc={canQc} />;
}

function AccessDenied() {
  return (
    <div className="flex h-full min-h-0 items-center justify-center bg-[#F3F5F8] p-4">
      <div className="max-w-md rounded-xl border border-[#E2E6EA] bg-white p-6 text-center">
        <p className="text-[15px] font-bold text-gray-800">Akses Ditolak</p>
        <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
          Anda tidak memiliki permission{" "}
          <span className="font-semibold text-gray-800">
            label_bahanbaku:read
          </span>{" "}
          untuk membuka halaman Label Bahan Baku. Hubungi administrator untuk
          memberikan akses.
        </p>
      </div>
    </div>
  );
}
