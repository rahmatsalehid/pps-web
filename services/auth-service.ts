// Kontrak request/response untuk endpoint auth backend
// (E:\JOB\API\pps-backend\src\modules\auth). Tipe di file ini mengikuti
// persis bentuk JSON yang dikembalikan auth-controller.js — termasuk alur
// gate NIK (nik_required / nik_not_found / nik_confirm) sebelum token
// diterbitkan.
import { apiFetch, apiFetchAuth } from "@/services/api";

// Nama cookie disamakan dengan token JWT backend (expiresIn: "12h" di
// auth-controller.js login()).
export const AUTH_TOKEN_COOKIE = "pps_token";

// Cookie kedua untuk menyimpan profil ringkas user yang login, dipakai untuk
// menampilkan nama & grup di UI (nav/header) tanpa perlu decode token JWT.
// JWT backend sendiri hanya berisi idUsername & username (lihat
// auth-controller.js login()), tidak ada fullName/uGroupName di dalamnya.
export const AUTH_USER_COOKIE = "pps_user";

export type SessionUser = {
  username: string;
  fullName: string;
  uGroupName: string | null;
};

export type LoginPayload = {
  username: string;
  password: string;
  nik?: string;
  confirmNik?: boolean;
};

export type LoginErrorType =
  | "validation"
  | "user_not_found"
  | "user_inactive"
  | "invalid_credentials"
  | "nik_required"
  | "nik_not_found"
  | "nik_confirm"
  | "server_error"
  | "database_connection";

export type LoginEmployee = {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  companyId: string;
};

export type LoginUser = {
  idUsername: number;
  username: string;
  fullName: string;
  nik: string;
  companyId: string | null;
  idUGroup: number | null;
  uGroupName: string | null;
  permissions: unknown;
};

export type LoginResponse =
  | { success: true; message: string; token?: string; user?: LoginUser }
  | {
      success: false;
      errorType: LoginErrorType;
      message?: string;
      employee?: LoginEmployee;
    };

export function loginRequest(payload: LoginPayload) {
  return apiFetch<LoginResponse>("/auth/login2", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type MePermissionsResponse = {
  success: boolean;
  username?: string | null;
  idUsername?: number | null;
  permissions?: string[];
  message?: string;
};

/** Daftar permission user yang sedang login (GET /api/auth/me). */
export function fetchMyPermissions(token: string | undefined) {
  if (!token) {
    return Promise.resolve({
      status: 401,
      data: { success: false, permissions: [] } as MePermissionsResponse,
    });
  }
  return apiFetchAuth<MePermissionsResponse>("/auth/me", token);
}

export function hasPermission(
  permissions: string[] | undefined | null,
  code: string,
): boolean {
  if (!permissions) return false;
  if (permissions.includes("*")) return true;
  return permissions.includes(code);
}
