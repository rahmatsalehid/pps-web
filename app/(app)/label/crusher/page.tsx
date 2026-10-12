import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  AUTH_TOKEN_COOKIE,
  fetchMyPermissions,
  hasPermission,
} from "@/services/auth-service";
import { LcsWorkspace } from "@/components/label/crusher/lcs-workspace";

export const metadata: Metadata = {
  title: "Label Crusher — PPS",
};

export default async function LabelCrusherPage() {
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
    canView = hasPermission(perms, "label_crusher:read");
    canCreate = hasPermission(perms, "label_crusher:create");
    canUpdate = hasPermission(perms, "label_crusher:update");
    canDelete = hasPermission(perms, "label_crusher:delete");
    canHistory = hasPermission(perms, "label_washing:read");
  } catch {
    canView = false;
  }

  if (!canView) {
    return <AccessDenied />;
  }

  return (
    <LcsWorkspace
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
          <span className="font-semibold text-gray-800">label_crusher:read</span>{" "}
          untuk membuka halaman Label Crusher. Hubungi administrator untuk memberikan
          akses.
        </p>
      </div>
    </div>
  );
}
