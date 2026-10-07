import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  AUTH_TOKEN_COOKIE,
  fetchMyPermissions,
  hasPermission,
} from "@/services/auth-service";
import { OperatorReguWorkspace } from "@/components/master/operator-regu/operator-regu-workspace";

export const metadata: Metadata = {
  title: "Master Operator & Regu — PPS",
};

export default async function MasterOperatorReguPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;

  let canView = false;
  let canCreate = false;
  let canUpdate = false;
  let canDelete = false;
  try {
    const me = await fetchMyPermissions(token);
    const perms = me.data.permissions;
    canView = hasPermission(perms, "datamasteroperator:read");
    canCreate = hasPermission(perms, "datamasteroperator:create");
    canUpdate = hasPermission(perms, "datamasteroperator:update");
    canDelete = hasPermission(perms, "datamasteroperator:delete");
  } catch {
    canView = false;
    canCreate = false;
    canUpdate = false;
    canDelete = false;
  }

  if (!canView) {
    return <AccessDenied />;
  }

  return (
    <OperatorReguWorkspace
      canCreate={canCreate}
      canUpdate={canUpdate}
      canDelete={canDelete}
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
          <span className="font-semibold text-gray-800">
            datamasteroperator:read
          </span>{" "}
          untuk membuka halaman Master Operator &amp; Regu. Hubungi
          administrator untuk memberikan akses.
        </p>
      </div>
    </div>
  );
}
