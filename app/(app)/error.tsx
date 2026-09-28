"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-lg font-semibold text-slate-900">
        Terjadi kesalahan
      </h2>
      <p className="max-w-md text-sm text-slate-600">
        {error.message || "Gagal memuat halaman."}
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
      >
        Coba lagi
      </button>
    </div>
  );
}
