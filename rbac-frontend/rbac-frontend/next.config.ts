/** @type {import('next').NextConfig} */
const nextConfig = {
  // async rewrites() {
  //   return [
  //     {
  //       source: "/api/:path*",
  //       destination: "https://rbac-worker.tunganhnguyenphu.workers.dev/:path*", // Chuyển hướng mọi cuộc gọi /api sang Worker
  //     },
  //   ];
  // },
  output: "export",
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
