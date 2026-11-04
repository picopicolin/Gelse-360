import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Subida de planos: las fotos ya llegan reducidas desde el navegador, pero un PDF de planos puede pesar varios MB.
  // (En Vercel el límite real de una petición es 4,5 MB.)
  experimental: { serverActions: { bodySizeLimit: "20mb" } },
};

export default nextConfig;
