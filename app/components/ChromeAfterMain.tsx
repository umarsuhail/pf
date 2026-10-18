"use client";

import dynamic from "next/dynamic";

const HoloChat = dynamic(() => import("./HoloChat"), { ssr: false });

export default function ChromeAfterMain() {
  return <HoloChat />;
}
