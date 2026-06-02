import createMDX from "@next/mdx";
import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  webpack(config, { dev }) {
    if (dev) {
      const stubPath = path.join(
        process.cwd(),
        "src/lib/next-devtools-segment-explorer-stub.tsx",
      );

      config.resolve.alias = {
        ...(config.resolve.alias ?? {}),
        "next/dist/next-devtools/userspace/app/segment-explorer-node": stubPath,
        "next/dist/esm/next-devtools/userspace/app/segment-explorer-node":
          stubPath,
      };
    }

    return config;
  },
};

const withMDX = createMDX({
  extension: /\.mdx?$/,
});

export default withMDX(nextConfig);
