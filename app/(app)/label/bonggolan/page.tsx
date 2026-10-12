import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  AUTH_TOKEN_COOKIE,
  fetchMyPermissions,
  hasPermission,
} from "@/services/auth-service";
import { LbgWorkspace } from "@/components/label/bonggolan/lbg-workspace";

export const metadata: Metadata = {
  title: "Label Bonggolan — PPS",
};

export default async function LabelBonggolanPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;

  let canView = false;
  let canCreate = false;
  let canUpdate = false;
  let canDelete = false;
  let canHistory = false;
  try {
    const me = await fetchMyPermissions(token);
    const perms = me.data.permissions;
    canView = hasPermission(perms, "label_bonggolan:read");
    canCreate = hasPermission(perms, "label_bonggolan:create");
    canUpdate = hasPermission(perms, "label_bonggolan:update");
    canDelete = hasPermission(perms, "label_bonggolan:delete");
    canHistory = hasPermission(perms, "label_washing:read");
  } catch {
    canView = false;
  }

  if (!canView) {
    return <AccessDenied />;
  }

  return (
    <LbgWorkspace
      canCreate={canCreate}
      canUpdate={canUpdate}
      canDelete={canDelete}
      canHistory={canHistory}
    />
  );
}

function AccessDenied() {
  return (
    <div className="flex h-full min-h-0 items-center justify-center bg-[#F3F5F8] p-4">
      <div className="max-w-md rounded-xl border border-[#E2E6EA] bg-white p-6 text-center">
        <p className="text-[15px] font-bold text-gray-800">Akses Ditolak</p>
        <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
          Anda tidak memiliki permission{" "}
          <span className="font-semibold text-gray-800">label_bonggolan:read</span>{" "}
          untuk membuka halaman Label Bonggolan. Hubungi administrator untuk
          memberikan akses.
        </p>
      </div>
    </div>
  );
}
