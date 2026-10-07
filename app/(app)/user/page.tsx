import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  AUTH_TOKEN_COOKIE,
  fetchMyPermissions,
  hasPermission,
} from "@/services/auth-service";
import { UserWorkspace } from "@/components/user/user-workspace";

export const metadata: Metadata = {
  title: "User — PPS",
};

export default async function UserPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;

  let canView = false;
  let canCreate = false;
  let canUpdate = false;
  let canDelete = false;
  try {
    const me = await fetchMyPermissions(token);
    const perms = me.data.permissions;
    canView = hasPermission(perms, "datamasteruser:read");
    canCreate = hasPermission(perms, "datamasteruser:create");
    canUpdate = hasPermission(perms, "datamasteruser:update");
    canDelete = hasPermission(perms, "datamasteruser:delete");
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
    <UserWorkspace
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
            datamasteruser:read
          </span>{" "}
          untuk membuka halaman User. Hubungi administrator untuk memberikan
          akses.
        </p>
      </div>
    </div>
  );
}
