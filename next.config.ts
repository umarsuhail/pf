import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    // Next 16 defaults this to [75] and refuses any other value outright —
    // a `quality` prop the list does not contain does not fall back, the
    // optimizer just returns nothing and the image never loads. 55 is here
    // for the loader's bg.jpg, which sits behind a scrim running from 0.42
    // opacity to solid and is the other high-priority image racing the LCP
    // element for the connection.
    qualities: [55, 75],
  },
};

export default withSerwist(nextConfig);
