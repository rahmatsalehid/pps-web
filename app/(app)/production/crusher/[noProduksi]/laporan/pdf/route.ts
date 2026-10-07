import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { getBackendBaseUrl } from "@/services/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ noProduksi: string }> },
) {
  const { noProduksi: raw } = await params;
  const noProduksi = decodeURIComponent(raw);

  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
  if (!token) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const safeName = noProduksi.replace(/[^A-Za-z0-9_-]+/g, "-") || "laporan";

  let upstream: Response;
  try {
    upstream = await fetch(
      `${getBackendBaseUrl()}/api/production/crusher/${encodeURIComponent(noProduksi)}/report/pdf`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );
  } catch {
    return new Response(
      JSON.stringify({ message: "Server laporan tidak dapat dihubungi" }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!upstream.ok) {
    const body = await upstream.text().catch(() => "");
    let message = "Gagal memuat laporan";
    try {
      const parsed = JSON.parse(body) as { message?: string };
      if (parsed?.message) message = parsed.message;
    } catch {
      if (body) message = body;
    }
    return new Response(JSON.stringify({ message }), {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const pdf = await upstream.arrayBuffer();
  return new Response(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Laporan-Crusher-${safeName}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
