import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Masuk — PPS",
};

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#7d5a91] via-[#c98a9b] to-[#f0a97e] px-4 py-10">
      {/* Judul di atas kartu */}
      <h1 className="mb-8 text-center text-3xl font-extrabold tracking-tight text-white drop-shadow-sm sm:text-4xl">
        WELCOME PPS
      </h1>

      {/* Kartu login — tanpa backdrop-blur (iOS Safari: blur bisa memblokir tap) */}
      <div className="w-full max-w-sm rounded-3xl border border-white/25 bg-white/85 p-7 shadow-2xl">
        <div className="mb-6 flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo2.png"
            alt="PPS Logo"
            className="mb-8 h-20 w-20 rounded-2xl object-contain shadow-lg"
          />
          <span className="text-center">
            <span className="block text-xs text-slate-700">Plastic Production System</span>
          </span>
        </div>

        <LoginForm />
      </div>

      <p className="mt-6 text-center text-xs text-white/80">
        Copyright © {new Date().getFullYear()}, PPS
        <br />
        All rights reserved.
      </p>
    </div>
  );
}
