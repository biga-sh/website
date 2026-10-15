import { createMDX } from "fumadocs-mdx/next";

/** @type {import('next').NextConfig} */
const nextConfig = {
    // ioredis is a native-ish server dependency — keep it external so it is
    // required at runtime rather than bundled into the server build.
    serverExternalPackages: ["ioredis", "@spire/redis", "@spire/server"],
};

const withMDX = createMDX();

export default withMDX(nextConfig);
