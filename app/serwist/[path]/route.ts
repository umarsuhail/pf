import { createSerwistRoute } from "@serwist/turbopack";
import { spawnSync } from "node:child_process";

// A build-time revision so the precache manifest busts on every deploy;
// falls back to a random id if git isn't available in the build environment.
const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout.trim() ||
  crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    additionalPrecacheEntries: [{ url: "/~offline", revision }],
    swSrc: "app/sw.ts",
    useNativeEsbuild: true,
  });
