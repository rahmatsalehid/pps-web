import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  AUTH_TOKEN_COOKIE,
  fetchMyPermissions,
  hasPermission,
} from "@/services/auth-service";
import { PbbWorkspace } from "@/components/production/penerimaan-bahan-baku/pbb-workspace";

export const metadata: Metadata = {
  title: "Penerimaan Bahan Baku • PPS",
};

export default async function PenerimaanBahanBakuPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;

  let canView = false;
  try {
    const me = await fetchMyPermissions(token);
    canView = hasPermission(me.data.permissions, "penerimaanbahanbaku:read");
  } catch {
    canView = false;
  }

  if (!canView) {
    return <AccessDenied />;
  }

  return <PbbWorkspace />;
}

function AccessDenied() {
  return (
    <div className="flex h-full min-h-0 items-center justify-center bg-[#F3F5F8] p-4">
      <div className="max-w-md rounded-xl border border-[#E2E6EA] bg-white p-6 text-center">
        <p className="text-[15px] font-bold text-gray-800">Akses Ditolak</p>
        <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
          Anda tidak memiliki permission{" "}
          <span className="font-semibold text-gray-800">
            penerimaanbahanbaku:read
          </span>{" "}
          untuk membuka halaman Penerimaan Bahan Baku. Hubungi administrator
          untuk memberikan akses.
        </p>
      </div>
    </div>
  );
}
