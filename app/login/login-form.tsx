"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { EyeIcon, EyeOffIcon, Loader2Icon, X } from "@/components/dashboard/icons";
import { loginAction, type LoginFormState } from "./actions";

const initialState: LoginFormState = { status: "idle" };

function SubmitButton({
  children,
  name,
  value,
}: {
  children: React.ReactNode;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-rose-600 px-7 text-sm font-semibold text-white shadow-lg transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2Icon className="h-4 w-4 animate-spin" /> Memproses…
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<LoginFormState, FormData>(
    loginAction,
    initialState,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);

  const messageId = "login-message";
  const hasError = state.status === "error";
  const showError = hasError && Boolean(state.message) && !dismissed;
  const showNikInput = state.status === "nik_required" || state.status === "nik_not_found";
  const showNikConfirm = state.status === "nik_confirm" && Boolean(state.employee);

  const dismissError = () => {
    setDismissed(true);
    requestAnimationFrame(() => usernameRef.current?.focus());
  };

  // Reset dismissed saat form disubmit (percobaan baru)
  const handleSubmit = () => {
    setDismissed(false);
  };

  // Enter atau Esc untuk menutup error modal
  useEffect(() => {
    if (!showError) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "Escape") {
        e.preventDefault();
        dismissError();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showError]);

  // Error modal overlay — hanya muncul sekali (percobaan pertama)
  if (showError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60">
        <div className="mx-4 flex w-full max-w-md flex-col items-center rounded-[2rem] bg-white px-8 py-12 text-center shadow-2xl">
          <div className="mb-6 grid h-16 w-16 place-items-center rounded-full bg-red-500">
            <X className="h-8 w-8 text-white stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">
            Login Gagal
          </h2>
          <p className="mt-2 text-base font-medium text-slate-600">
            Invalid NIK or PASSWORD
          </p>
          <button
            type="button"
            onClick={dismissError}
            className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-slate-950 px-8 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800"
          >
            OK
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label
          htmlFor="username"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600"
        >
          NIK
        </label>
        <input
          id="username"
          name="username"
          ref={usernameRef}
          type="text"
          autoComplete="off"
          autoFocus
          required
          aria-describedby={messageId}
          className="h-11 w-full rounded-xl border-0 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:ring-2 focus:ring-rose-400"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="off"
            required
            aria-describedby={messageId}
            className="h-11 w-full rounded-xl border-0 bg-white px-4 pr-11 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-rose-400"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
          >
            {showPassword ? (
              <EyeIcon className="h-4 w-4" />
            ) : (
              <EyeOffIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {showNikInput && (
        <div>
          <label
            htmlFor="nik"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600"
          >
            NIK
          </label>
          <p id="nik-hint" className="mb-1.5 text-xs text-slate-600">
            Akun Anda belum terhubung dengan NIK. Masukkan NIK karyawan untuk
            melanjutkan.
          </p>
          <input
            id="nik"
            name="nik"
            type="text"
            inputMode="numeric"
            pattern="[0-9]+"
            defaultValue={state.nik ?? ""}
            required
            aria-describedby={`nik-hint`}
            className="h-11 w-full rounded-xl border-0 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-rose-400"
          />
        </div>
      )}

      {showNikConfirm && state.employee && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <input type="hidden" name="nik" value={state.nik ?? ""} />
          <p id="employee-confirm-heading" className="mb-2 text-sm font-medium text-slate-900">
            Konfirmasi data karyawan berikut:
          </p>
          <dl aria-labelledby="employee-confirm-heading" className="text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Nama</dt>
              <dd className="font-medium text-slate-900">{state.employee.fullName}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">NIK</dt>
              <dd className="font-medium text-slate-900">{state.employee.employeeCode}</dd>
            </div>
          </dl>
        </div>
      )}

      <div
        id={messageId}
        role="status"
        aria-live="polite"
        className="text-sm text-slate-600"
      />

      <div className="flex justify-end gap-3 pt-2">
        {showNikConfirm ? (
          <>
            <SubmitButton name="intent" value="confirm">
              Ya, konfirmasi
            </SubmitButton>
            <button
              type="submit"
              name="intent"
              value="reject"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-300 px-7 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Bukan saya
            </button>
          </>
        ) : (
          <SubmitButton>{showNikInput ? "Lanjutkan" : "Login"}</SubmitButton>
        )}
      </div>
    </form>
  );
}
