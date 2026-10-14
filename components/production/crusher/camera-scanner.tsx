"use client";

import { useEffect, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";

/**
 * Pemindai barcode/QR lewat kamera perangkat (iPhone Safari, tablet Android,
 * laptop). Memakai ZXing sehingga jalan di semua browser, tidak bergantung
 * pada BarcodeDetector. Butuh koneksi HTTPS (atau localhost) agar browser
 * mengizinkan akses kamera.
 */
export function CameraScanner({
  onDetected,
  paused = false,
}: {
  onDetected: (text: string) => void;
  /** true = abaikan hasil baca (mis. sedang memproses scan sebelumnya). */
  paused?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  const onDetectedRef = useRef(onDetected);
  const pausedRef = useRef(paused);
  useEffect(() => {
    onDetectedRef.current = onDetected;
    pausedRef.current = paused;
  });

  useEffect(() => {
    let controls: IScannerControls | null = null;
    let cancelled = false;
    let lastText = "";
    let lastAt = 0;

    void (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(
          "Browser ini tidak mendukung akses kamera. Buka lewat HTTPS atau Safari/Chrome terbaru.",
        );
        setStarting(false);
        return;
      }
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (cancelled || !videoRef.current) return;
        const reader = new BrowserMultiFormatReader(undefined, {
          delayBetweenScanAttempts: 120,
        });
        controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          videoRef.current,
          (result) => {
            if (!result || pausedRef.current) return;
            const text = result.getText().trim();
            const now = Date.now();
            if (!text || (text === lastText && now - lastAt < 2500)) return;
            lastText = text;
            lastAt = now;
            onDetectedRef.current(text);
          },
        );
        if (cancelled) controls.stop();
        else setStarting(false);
      } catch (e) {
        const name = e instanceof Error ? e.name : "";
        setError(
          name === "NotAllowedError"
            ? "Akses kamera ditolak. Izinkan kamera untuk situs ini di pengaturan browser."
            : name === "NotFoundError"
              ? "Kamera tidak ditemukan di perangkat ini."
              : "Gagal membuka kamera. Pastikan halaman dibuka lewat HTTPS dan kamera tidak dipakai aplikasi lain.",
        );
        setStarting(false);
      }
    })();

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, []);

  if (error) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
        {error}
      </p>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-black">
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        className="aspect-[4/3] w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-white/70" />
      {starting && (
        <div className="absolute inset-0 grid place-items-center bg-black/60 text-xs text-white">
          Membuka kamera…
        </div>
      )}
      {paused && !starting && (
        <div className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-center text-[11px] text-white">
          Memproses…
        </div>
      )}
    </div>
  );
}
