import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  AUTH_TOKEN_COOKIE,
  fetchMyPermissions,
  hasPermission,
} from "@/services/auth-service";
import { PermissionGroupWorkspace } from "@/components/master/permission-group/permission-group-workspace";

export const metadata: Metadata = {
  title: "Master Permission Group — PPS",
};

export default async function PermissionGroupPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;

  let canView = false;
  let canCreate = false;
  let canUpdate = false;
  let canDelete = false;
  try {
    const me = await fetchMyPermissions(token);
    const perms = me.data.permissions;
    canView = hasPermission(perms, "datamasterpermissiongroup:read");
    canCreate = hasPermission(perms, "datamasterpermissiongroup:create");
    canUpdate = hasPermission(perms, "datamasterpermissiongroup:update");
    canDelete = hasPermission(perms, "datamasterpermissiongroup:delete");
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
    <PermissionGroupWorkspace
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
            datamasterpermissiongroup:read
          </span>{" "}
          untuk membuka halaman Master Permission Group. Hubungi administrator
          untuk memberikan akses.
        </p>
      </div>
    </div>
  );
}
