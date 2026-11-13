import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (the local development database) loads its own WASM files from
  // disk, so it has to stay out of the server bundle.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
