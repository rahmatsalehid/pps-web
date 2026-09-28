import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16 memblokir asset dev lintas origin (403) kecuali hostname diizinkan.
  // Tanpa ini, akses dari tablet/hp via IP LAN → JS tidak hydrate → tombol mati.
  allowedDevOrigins: ["192.168.10.186"],
};

export default nextConfig;
