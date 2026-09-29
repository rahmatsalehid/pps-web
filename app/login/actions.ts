"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiRequestError } from "@/services/api";
import {
  AUTH_TOKEN_COOKIE,
  AUTH_USER_COOKIE,
  loginRequest,
  type LoginEmployee,
  type SessionUser,
} from "@/services/auth-service";

export type LoginFormState = {
  status: "idle" | "error" | "nik_required" | "nik_not_found" | "nik_confirm";
  message?: string;
  nik?: string;
  employee?: LoginEmployee;
};

// Masa berlaku cookie disamakan dengan token JWT backend
// (expiresIn: "12h" di auth-controller.js login()).
const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 12;

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nik = String(formData.get("nik") ?? "").trim();
  const intent = String(formData.get("intent") ?? "");

  if (!username || !password) {
    return { status: "error", message: "Username dan password harus diisi" };
  }

  // Tombol "Bukan saya, ubah NIK" — kembali ke input NIK tanpa memanggil
  // backend lagi, karena kredensial & NIK sebelumnya sudah pernah divalidasi
  // saat mencapai status nik_confirm.
  if (intent === "reject") {
    return {
      status: "nik_required",
      message: "Silakan masukkan NIK yang benar.",
    };
  }

  let result;
  try {
    result = await loginRequest({
      username,
      password,
      nik: nik || undefined,
      confirmNik: intent === "confirm" ? true : undefined,
    });
  } catch (error) {
    const message =
      error instanceof ApiRequestError
        ? error.message
        : "Terjadi kesalahan tak terduga. Silakan coba lagi.";
    return { status: "error", message };
  }

  const { data } = result;

  if (!data.success) {
    if (data.errorType === "nik_required" || data.errorType === "nik_not_found") {
      return { status: data.errorType, message: data.message, nik };
    }

    if (data.errorType === "nik_confirm") {
      return {
        status: "nik_confirm",
        message: data.message,
        nik,
        employee: data.employee,
      };
    }

    return {
      status: "error",
      message: data.message ?? "Login gagal. Silakan coba lagi.",
    };
  }

  // Backend versi lama bisa tidak mengirim token/user (kontrak login2 berubah
  // antar versi). Jangan set cookie kosong — kalau cookie "pps_token" kosong,
  // semua modul akan gagal dengan "Tidak terautentikasi".
  if (typeof data.token !== "string" || !data.token) {
    return {
      status: "error",
      message:
        "Login gagal: backend tidak mengirim token. Periksa versi pps-backend dan BACKEND_API_URL di .env.",
    };
  }

  // Backend tidak mengelola cookie/session sama sekali — token JWT hanya
  // dikembalikan lewat body JSON dan divalidasi via header Authorization
  // (lihat verify-token.js). Supaya token tidak pernah terpapar ke JS
  // client-side (rawan XSS), Next.js berperan sebagai BFF: token disimpan
  // di cookie httpOnly yang di-set di sini, bukan localStorage/sessionStorage.
  // `secure` diaktifkan lewat COOKIE_SECURE=true (wajib saat diakses via
  // HTTPS); default false karena server Docker diakses via HTTP.
  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax" as const,
    path: "/",
    maxAge: TOKEN_MAX_AGE_SECONDS,
  };

  cookieStore.set(AUTH_TOKEN_COOKIE, data.token, cookieOptions);

  const sessionUser: SessionUser = {
    username: data.user?.username || username,
    fullName: data.user?.fullName || username,
    uGroupName: data.user?.uGroupName ?? null,
  };
  cookieStore.set(AUTH_USER_COOKIE, JSON.stringify(sessionUser), cookieOptions);

  redirect("/");
}
