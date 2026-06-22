import createMDX from "@next/mdx";
import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  // Next 15.5 devtools "Segment Explorer"가 RSC client manifest에서
  // SegmentViewNode를 못 찾아 dev 서버가 깨지는 버그가 있어 기능 자체를 끔
  experimental: {
    devtoolSegmentExplorer: false,
  },
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
