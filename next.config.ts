import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  transpilePackages: ["three-globe", "@react-three/fiber", "@react-three/drei"],
};

export default nextConfig;
