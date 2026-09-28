"use client";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          fontFamily: "system-ui, sans-serif",
          background: "#fff",
          color: "#0f172a",
          padding: 24,
          textAlign: "center",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
          Aplikasi bermasalah
        </h2>
        <p style={{ margin: 0, maxWidth: 420, fontSize: 14, color: "#475569" }}>
          {error.message || "Terjadi kesalahan tak terduga."}
        </p>
        <button
          type="button"
          onClick={() => retry()}
          style={{
            border: 0,
            borderRadius: 8,
            background: "#0f172a",
            color: "#fff",
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Muat ulang
        </button>
      </body>
    </html>
  );
}
